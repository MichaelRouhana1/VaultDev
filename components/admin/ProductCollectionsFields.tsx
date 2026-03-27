"use client";

import { Label } from "@/components/ui/label";

export type CollectionOption = { id: number; name: string; slug: string };

export function ProductCollectionsFields({
  collectionsByStore,
  listingStore,
  selectedIds,
  onChange,
}: {
  collectionsByStore: Record<"streetwear" | "formal", CollectionOption[]>;
  listingStore: "streetwear" | "formal";
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const list = collectionsByStore[listingStore];

  function toggle(id: number) {
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange([...set].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Collections / special categories</Label>
      <p className="text-xs text-muted-foreground">
        Optional. A product can belong to multiple collections (e.g. seasonal drops, sales).
      </p>
      <div className="grid gap-2 sm:grid-cols-2 border border-border rounded-md p-3 max-h-52 overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full">
            No collections for this store. Create some under Admin → Collections.
          </p>
        ) : (
          list.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 rounded border-input"
              />
              <span>{c.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
