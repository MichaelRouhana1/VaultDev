"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const LOW_STOCK_THRESHOLD = 5;

/** One purchasable variant row for admin stock tooltip (from dynamic options + legacy fallback). */
export type AdminVariantStockRow = {
  variantId: number;
  displayLabel: string;
  quantity: number;
  sku: string | null;
};

/**
 * Global low-stock warning: any variant has stock strictly between 0 and threshold.
 * (Out-of-stock-only products do not trigger this; see tooltip row styling for zeros.)
 */
export function productHasLowStock(
  variants: AdminVariantStockRow[] | undefined,
  threshold: number = LOW_STOCK_THRESHOLD,
): boolean {
  if (!variants?.length) return false;
  return variants.some((v) => v.quantity > 0 && v.quantity < threshold);
}

interface StockHoverCellProps {
  /** Sum of variant quantities; should match sum of `variants[].quantity` when provided. */
  totalStock: number;
  variants: AdminVariantStockRow[];
  lowStockThreshold?: number;
}

export function StockHoverCell({
  totalStock,
  variants,
  lowStockThreshold = LOW_STOCK_THRESHOLD,
}: StockHoverCellProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anyLow = useMemo(
    () => productHasLowStock(variants, lowStockThreshold),
    [variants, lowStockThreshold],
  );

  const sortedVariants = useMemo(() => {
    return [...variants].sort((a, b) => {
      const la = a.displayLabel.toLowerCase();
      const lb = b.displayLabel.toLowerCase();
      if (la !== lb) return la.localeCompare(lb);
      return a.variantId - b.variantId;
    });
  }, [variants]);

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

  const rowClass = (qty: number) => {
    if (qty <= 0) {
      return "border-destructive/60 bg-destructive/5 text-destructive";
    }
    if (qty < lowStockThreshold) {
      return "border-amber-500/60 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    }
    return "border-border bg-muted/30 text-foreground";
  };

  const popupContent = open && (
    <div
      className="fixed z-[9999] min-w-[220px] max-w-[min(90vw,360px)] -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 shadow-lg pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Stock by variant
      </p>
      <p className={cn("mb-3 text-lg font-bold tabular-nums", anyLow && "text-destructive")}>
        {totalStock} in stock
      </p>
      <ul className="space-y-2 max-h-[min(60vh,320px)] overflow-y-auto pr-1">
        {sortedVariants.length === 0 ? (
          <li className="text-xs text-muted-foreground">No variant rows</li>
        ) : (
          sortedVariants.map((v) => (
            <li
              key={v.variantId}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-sm",
                rowClass(v.quantity),
              )}
            >
              <span className="min-w-0 truncate font-medium" title={v.displayLabel}>
                {v.displayLabel}
              </span>
              <span className="tabular-nums shrink-0 font-semibold">{v.quantity}</span>
            </li>
          ))
        )}
      </ul>
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
          <span className="inline-flex text-amber-500" title="Low stock: a variant is below threshold (but not sold out)">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
          </span>
        )}
        <span className={cn("cursor-default tabular-nums", anyLow && "text-destructive font-medium")}>
          {totalStock} in stock
        </span>
      </div>
      {open && typeof document !== "undefined" && createPortal(popupContent, document.body)}
    </>
  );
}
