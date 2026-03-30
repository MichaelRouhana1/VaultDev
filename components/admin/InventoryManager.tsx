"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Minimal row shape for the stock grid (create + edit product forms). */
export type InventoryStockColor = {
  id: string | number;
  name: string;
  stockBySize: Record<string, number>;
};

/**
 * Client-only grid for editing per-size stock. Submitted stock is persisted and logged as
 * `STOCK_OVERRIDE` in Security logs when the product form saves via `updateProduct`.
 */
interface InventoryManagerProps {
  colors: InventoryStockColor[];
  sizes: readonly string[];
  updateColor: (id: string | number, updates: { stockBySize?: Record<string, number> }) => void;
  /** When true, omit outer title (use inside a parent card header). */
  embedded?: boolean;
}

export function InventoryManager({
  colors,
  sizes,
  updateColor,
  embedded = false,
}: InventoryManagerProps) {
  const [bulkStock, setBulkStock] = useState("");

  const applyBulkToAll = useCallback(() => {
    const trimmed = bulkStock.trim();
    if (trimmed === "") return;
    const n = Math.max(0, parseInt(trimmed, 10) || 0);
    const nextSizes = Object.fromEntries(sizes.map((s) => [s, n])) as Record<string, number>;
    for (const c of colors) {
      updateColor(c.id, { stockBySize: nextSizes });
    }
  }, [bulkStock, colors, sizes, updateColor]);

  if (colors.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        {!embedded ? (
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Stock by color &amp; size</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Set inventory for each color and size combination
            </p>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground lg:max-w-xs">
            Set quantity per cell, or use <span className="font-medium text-foreground">Apply to all</span> for
            every size on every color.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Label htmlFor="inventory-bulk-stock" className="text-xs text-muted-foreground whitespace-nowrap">
            Bulk qty
          </Label>
          <Input
            id="inventory-bulk-stock"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Qty"
            value={bulkStock}
            onChange={(e) => setBulkStock(e.target.value)}
            onBlur={() => applyBulkToAll()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyBulkToAll();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-8 w-[4.5rem] text-center text-sm"
            title="Enter a quantity, then Apply to all or press Enter"
          />
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={applyBulkToAll}>
            Apply to all
          </Button>
        </div>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Color
              </th>
              {sizes.map((s) => (
                <th
                  key={s}
                  className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {colors.map((color) => (
              <tr key={String(color.id)} className="bg-background hover:bg-muted/15 transition-colors">
                <td className="px-3 py-2.5 font-medium text-foreground">{color.name || "—"}</td>
                {sizes.map((size) => (
                  <td key={size} className="p-2 text-center">
                    <Input
                      type="number"
                      aria-label={`Stock for ${color.name} size ${size}`}
                      min={0}
                      value={color.stockBySize[size] ?? 0}
                      onChange={(e) =>
                        updateColor(color.id, {
                          stockBySize: {
                            ...color.stockBySize,
                            [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          },
                        })
                      }
                      className="h-8 w-16 text-center mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
