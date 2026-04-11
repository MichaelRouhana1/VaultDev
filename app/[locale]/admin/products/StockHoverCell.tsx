"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/low-stock-threshold";
import { cn, sortSizes } from "@/lib/utils";

export const LOW_STOCK_THRESHOLD = DEFAULT_LOW_STOCK_THRESHOLD;

/** One purchasable variant row for admin stock tooltip (from dynamic options + legacy fallback). */
export type AdminVariantStockRow = {
  variantId: number;
  displayLabel: string;
  quantity: number;
  sku: string | null;
  /** Option display name → value (e.g. `{ Size: "32", Color: "Black" }`). */
  optionValues: Record<string, string>;
  /** Option names in catalog sort order. */
  orderedOptionNames: string[];
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

type GroupMode = { kind: "single" } | { kind: "multi"; groupByOptionName: string };

function resolveGroupMode(orderedOptionNames: string[]): GroupMode {
  if (orderedOptionNames.length <= 1) {
    return { kind: "single" };
  }
  const colorName = orderedOptionNames.find((n) => {
    const l = n.toLowerCase();
    return l === "color" || l === "colour";
  });
  return { kind: "multi", groupByOptionName: colorName ?? orderedOptionNames[0]! };
}

function cellLabel(
  v: AdminVariantStockRow,
  mode: GroupMode,
): string {
  if (mode.kind === "single") {
    if (v.orderedOptionNames.length === 0) {
      return v.displayLabel;
    }
    if (v.orderedOptionNames.length === 1) {
      const n = v.orderedOptionNames[0]!;
      return v.optionValues[n] ?? v.displayLabel;
    }
  }
  const groupName = mode.kind === "multi" ? mode.groupByOptionName : "";
  const rest = v.orderedOptionNames.filter((name) => name !== groupName);
  const labels = rest.map((name) => v.optionValues[name]).filter(Boolean);
  return labels.length > 0 ? labels.join(" · ") : v.displayLabel;
}

function sortGroupTitles(titles: string[], groupByOptionName: string): string[] {
  const l = groupByOptionName.toLowerCase();
  if (l === "size" || l.endsWith(" size")) {
    return sortSizes([...titles]);
  }
  return [...titles].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  );
}

function sortVariantsInGroup(rows: { v: AdminVariantStockRow; label: string }[]): typeof rows {
  return [...rows].sort((a, b) => {
    const la = a.label.toLowerCase();
    const lb = b.label.toLowerCase();
    if (la !== lb) return la.localeCompare(lb, undefined, { numeric: true, sensitivity: "base" });
    return a.v.variantId - b.v.variantId;
  });
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

  const grouped = useMemo(() => {
    if (variants.length === 0) {
      return { mode: { kind: "single" } as GroupMode, groups: [] as { title: string; rows: { v: AdminVariantStockRow; label: string }[] }[] };
    }

    const template = variants.find((v) => v.orderedOptionNames.length > 0) ?? variants[0]!;
    const mode = resolveGroupMode(template.orderedOptionNames);

    if (mode.kind === "single") {
      const rows = variants.map((v) => ({ v, label: cellLabel(v, mode) }));
      return {
        mode,
        groups: [{ title: "All options", rows: sortVariantsInGroup(rows) }],
      };
    }

    const { groupByOptionName } = mode;
    const byTitle = new Map<string, { v: AdminVariantStockRow; label: string }[]>();
    for (const v of variants) {
      const title = v.optionValues[groupByOptionName]?.trim() || "—";
      const label = cellLabel(v, mode);
      const list = byTitle.get(title) ?? [];
      list.push({ v, label });
      byTitle.set(title, list);
    }

    const sortedTitles = sortGroupTitles([...byTitle.keys()], groupByOptionName);
    const groups = sortedTitles.map((title) => ({
      title,
      rows: sortVariantsInGroup(byTitle.get(title) ?? []),
    }));

    return { mode, groups };
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

  const badgeClass = (qty: number) => {
    if (qty <= 0) {
      return "border-destructive/50 bg-destructive/10 text-destructive/90 opacity-90";
    }
    if (qty < lowStockThreshold) {
      return "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-100";
    }
    return "border-border/80 bg-muted/50 text-foreground";
  };

  const popupContent = open && (
    <div
      className="fixed z-[9999] min-w-[240px] max-w-[min(92vw,420px)] -translate-x-1/2 rounded-md border border-border bg-background px-4 py-3 shadow-lg pointer-events-auto"
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
      <div className="max-h-[300px] overflow-y-auto pr-2">
        {grouped.groups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No variant rows</p>
        ) : (
          <div className="space-y-5">
            {grouped.groups.map((g) => (
              <div key={g.title}>
                <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  {g.title}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {g.rows.map(({ v, label }) => (
                    <div
                      key={v.variantId}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-center text-[11px] font-semibold tabular-nums leading-tight",
                        badgeClass(v.quantity),
                      )}
                      title={v.displayLabel}
                    >
                      <span className="truncate" title={`${label} : ${v.quantity}`}>
                        {label} : {v.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
