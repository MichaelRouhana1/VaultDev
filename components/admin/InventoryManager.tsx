"use client";

import { useState, useCallback } from "react";
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
}

export function InventoryManager({ colors, sizes, updateColor }: InventoryManagerProps) {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h3 className="text-sm font-medium">Stock by color &amp; size</h3>
          <p className="text-xs text-muted-foreground">Set inventory for each color and size combination</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor="inventory-bulk-stock" className="text-xs text-muted-foreground whitespace-nowrap">
            All sizes
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
            title="Enter a quantity and press Enter or click away to set every size for every color"
          />
        </div>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Color</th>
              {sizes.map((s) => (
                <th key={s} className="p-3 font-medium text-center">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => (
              <tr key={String(color.id)} className="border-t border-border">
                <td className="p-3 font-medium">{color.name || "—"}</td>
                {sizes.map((size) => (
                  <td key={size} className="p-2">
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
                      className="h-8 w-16 text-center"
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
