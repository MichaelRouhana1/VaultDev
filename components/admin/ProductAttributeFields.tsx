"use client";

import { useMemo, useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import type { AttributeWithValues } from "@/actions/attributes";

export function ProductAttributeFields({
  attributesWithValues,
  initialSelectedIds = [],
}: {
  attributesWithValues: AttributeWithValues[];
  initialSelectedIds?: number[];
}) {
  const selectedSet = useMemo(() => new Set(initialSelectedIds), [initialSelectedIds]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const next: Record<number, boolean> = {};
    for (const id of initialSelectedIds) {
      next[id] = true;
    }
    setChecked(next);
  }, [initialSelectedIds]);

  if (attributesWithValues.length === 0) {
    return (
      <div className="space-y-2 sm:col-span-2">
        <Label>Attributes</Label>
        <p className="text-xs text-muted-foreground">
          No attributes defined yet. Add attributes under Admin → Attributes to tag products (fit, style, material, etc.).
        </p>
      </div>
    );
  }

  const toggle = (valueId: number) => {
    setChecked((prev) => ({ ...prev, [valueId]: !prev[valueId] }));
  };

  return (
    <div className="space-y-6 sm:col-span-2">
      <div>
        <Label className="text-base">Attributes</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Select any values that apply. A product can have multiple tags per group (e.g. Fit and Style).
        </p>
      </div>
      {attributesWithValues.map((attr) => (
        <div key={attr.id} className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">{attr.name}</h4>
          {attr.values.length === 0 ? (
            <p className="text-xs text-muted-foreground">No values yet for this attribute.</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {attr.values.map((v) => {
                const isOn = v.id in checked ? checked[v.id]! : selectedSet.has(v.id);
                return (
                  <label key={v.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name="attributeValueIds"
                      value={v.id}
                      checked={isOn}
                      onChange={() => toggle(v.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>{v.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
