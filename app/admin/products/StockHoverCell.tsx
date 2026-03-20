"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export const LOW_STOCK_THRESHOLD = 5;

export interface StockByColorRow {
  colorName: string;
  stockBySize: Record<string, number>;
}

export function productHasLowStock(
  stockByColor: StockByColorRow[] | undefined,
  stockBySize: Record<string, number>,
  threshold: number = LOW_STOCK_THRESHOLD,
): boolean {
  const checkMap = (m: Record<string, number>) =>
    SIZES.some((s) => (m[s] ?? 0) < threshold);

  if (stockByColor && stockByColor.length > 0) {
    return stockByColor.some((row) => checkMap(row.stockBySize));
  }
  return checkMap(stockBySize);
}

interface StockHoverCellProps {
  totalStock: number;
  stockBySize: Record<string, number>;
  /** When provided, shows a row per color with stock breakdown. Falls back to stockBySize when empty. */
  stockByColor?: StockByColorRow[];
  lowStockThreshold?: number;
}

export function StockHoverCell({
  totalStock,
  stockBySize,
  stockByColor,
  lowStockThreshold = LOW_STOCK_THRESHOLD,
}: StockHoverCellProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows =
    stockByColor && stockByColor.length > 0
      ? stockByColor
      : [{ colorName: "Stock", stockBySize }];

  const anyLow = productHasLowStock(stockByColor, stockBySize, lowStockThreshold);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 100);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const popupContent = open && (
    <div
      className="fixed z-[9999] min-w-[200px] -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 shadow-lg pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Stock
      </p>
      <p className={cn("mb-3 text-lg font-bold", anyLow && "text-destructive")}>{totalStock}</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.colorName} className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">{row.colorName}</p>
            <div className="flex gap-2 flex-wrap">
              {SIZES.map((size) => {
                const n = row.stockBySize[size] ?? 0;
                const low = n < lowStockThreshold;
                return (
                  <div
                    key={size}
                    className={cn(
                      "flex min-w-[2.5rem] flex-col items-center rounded border bg-muted/30 px-2 py-1.5",
                      low
                        ? "border-destructive border-2 ring-1 ring-destructive/30"
                        : "border-border",
                    )}
                  >
                    <span className="text-xs text-muted-foreground">{size}</span>
                    <span className={cn("font-medium", low && "text-destructive")}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="relative z-0 inline-flex items-center gap-1.5"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {anyLow && (
          <span className="inline-flex text-amber-500" title="Low stock: some variants below threshold">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
          </span>
        )}
        <span className={cn("cursor-default tabular-nums", anyLow && "text-destructive font-medium")}>
          {totalStock}
        </span>
      </div>
      {open && typeof document !== "undefined" && createPortal(popupContent, document.body)}
    </>
  );
}
