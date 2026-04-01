"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { comboKey, generateSkusForMatrix } from "@/lib/product-variant-matrix";

export type VariantMatrixCell = {
  sku: string;
  stockQuantity: string;
  priceOverride: string;
};

type VariantMatrixEditorProps = {
  productName: string;
  optionNamesForKeys: string[];
  combos: Record<string, string>[];
  matrix: Record<string, VariantMatrixCell>;
  setMatrix: React.Dispatch<React.SetStateAction<Record<string, VariantMatrixCell>>>;
  updateMatrixCell: (key: string, patch: Partial<VariantMatrixCell>) => void;
};

const emptyCell = (): VariantMatrixCell => ({
  sku: "",
  stockQuantity: "0",
  priceOverride: "",
});

export function VariantMatrixEditor({
  productName,
  optionNamesForKeys,
  combos,
  matrix,
  setMatrix,
  updateMatrixCell,
}: VariantMatrixEditorProps) {
  const [bulkStock, setBulkStock] = useState("");
  const [priceExpanded, setPriceExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const valid = new Set(
      combos.map((c) => comboKey(optionNamesForKeys, c)),
    );
    setPriceExpanded((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!valid.has(k)) delete next[k];
      }
      return next;
    });
  }, [combos, optionNamesForKeys]);

  const applyAutoSkus = useCallback(() => {
    const skus = generateSkusForMatrix(productName, optionNamesForKeys, combos);
    setMatrix((prev) => {
      const next = { ...prev };
      combos.forEach((c, i) => {
        const k = comboKey(optionNamesForKeys, c);
        const cur = next[k] ?? emptyCell();
        next[k] = { ...cur, sku: skus[i] ?? cur.sku };
      });
      return next;
    });
  }, [productName, optionNamesForKeys, combos, setMatrix]);

  const applyBulkStock = useCallback(() => {
    const trimmed = bulkStock.trim();
    if (trimmed === "") return;
    const n = Math.max(0, parseInt(trimmed, 10) || 0);
    setMatrix((prev) => {
      const next = { ...prev };
      for (const c of combos) {
        const k = comboKey(optionNamesForKeys, c);
        const cur = next[k] ?? emptyCell();
        next[k] = { ...cur, stockQuantity: String(n) };
      }
      return next;
    });
  }, [bulkStock, combos, optionNamesForKeys, setMatrix]);

  if (combos.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
      <header className="border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Variant matrix</h3>
        <p className="text-xs text-muted-foreground mt-1">
          One row per combination. SKUs must be unique in your catalog.
        </p>
      </header>

      <div className="px-4 py-4 sm:px-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={applyAutoSkus}>
            Auto-generate SKUs
          </Button>
          <p className="text-[11px] text-muted-foreground max-w-md">
            Uses product name initials plus each option value (e.g.{" "}
            <span className="font-mono text-foreground/80">BJ-32-BLACK</span>).
          </p>
        </div>

        <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {optionNamesForKeys.map((name) => (
                  <th
                    key={name}
                    className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                  >
                    {name}
                  </th>
                ))}
                <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[10rem]">
                  SKU
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col gap-1.5">
                    <span>Stock</span>
                    <div className="flex items-center gap-1.5 pr-1">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="Qty"
                        value={bulkStock}
                        onChange={(e) => setBulkStock(e.target.value)}
                        className="h-7 w-14 text-xs px-1.5"
                        aria-label="Bulk stock quantity"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] px-2 shrink-0"
                        onClick={applyBulkStock}
                      >
                        Apply to all
                      </Button>
                    </div>
                  </div>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[9rem]">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {combos.map((combo, rowIndex) => {
                const k = comboKey(optionNamesForKeys, combo);
                const cell = matrix[k] ?? emptyCell();
                const hasOverride = cell.priceOverride.trim().length > 0;
                const expanded = Boolean(priceExpanded[k]);

                return (
                  <tr
                    key={`variant-row-${rowIndex}-${k}`}
                    className="bg-background hover:bg-muted/20 transition-colors"
                  >
                    {optionNamesForKeys.map((name) => (
                      <td key={name} className="px-3 py-2.5 align-middle text-foreground">
                        {combo[name]}
                      </td>
                    ))}
                    <td className="px-3 py-2 align-middle min-w-0">
                      <Input
                        className="h-9 w-full min-w-0 max-w-full text-sm"
                        value={cell.sku}
                        onChange={(e) => updateMatrixCell(k, { sku: e.target.value })}
                        placeholder="SKU"
                        aria-label={`SKU for ${k}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <Input
                        className="h-9 w-20 text-sm"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={cell.stockQuantity}
                        onChange={(e) => updateMatrixCell(k, { stockQuantity: e.target.value })}
                        aria-label={`Stock for ${k}`}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {!expanded && !hasOverride ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPriceExpanded((p) => ({ ...p, [k]: true }))
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground whitespace-nowrap",
                            "hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 transition-colors",
                          )}
                          title="Add custom price (leave blank to use product default)"
                        >
                          <DollarSign className="size-3.5 shrink-0 opacity-70" aria-hidden />
                          Custom price
                        </button>
                      ) : !expanded && hasOverride ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono tabular-nums text-foreground">
                            ${cell.priceOverride.trim()}
                          </span>
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            onClick={() =>
                              setPriceExpanded((p) => ({ ...p, [k]: true }))
                            }
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 min-w-[8rem]">
                          <Input
                            className="h-9 text-sm"
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Leave blank for default price"
                            value={cell.priceOverride}
                            onChange={(e) =>
                              updateMatrixCell(k, { priceOverride: e.target.value })
                            }
                            aria-label={`Price override for ${k}`}
                          />
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            <button
                              type="button"
                              className="text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setPriceExpanded((p) => ({ ...p, [k]: false }))
                              }
                            >
                              Done
                            </button>
                            <button
                              type="button"
                              className="text-[10px] text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setPriceExpanded((p) => ({ ...p, [k]: false }));
                                updateMatrixCell(k, { priceOverride: "" });
                              }}
                            >
                              Remove override
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
