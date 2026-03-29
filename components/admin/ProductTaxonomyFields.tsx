"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import type { ProductFormCategoryTree } from "@/actions/categories";

type Store = "streetwear" | "formal";

export function ProductTaxonomyFields({
  categoryTrees,
  initialStoreType,
  initialMainCategoryId,
  listingStore,
  onListingStoreChange,
}: {
  categoryTrees: Record<Store, ProductFormCategoryTree>;
  initialStoreType: Store;
  initialMainCategoryId?: number;
  /** When set with `onListingStoreChange`, store radios are controlled (e.g. to sync collection pickers). */
  listingStore?: Store;
  onListingStoreChange?: (next: Store) => void;
}) {
  const [internalStore, setInternalStore] = useState<Store>(initialStoreType);
  const isControlled = listingStore !== undefined && onListingStoreChange !== undefined;
  const storeType = isControlled ? listingStore! : internalStore;
  const tree = categoryTrees[storeType];
  const [mainId, setMainId] = useState(
    initialMainCategoryId != null ? String(initialMainCategoryId) : "",
  );

  function switchStore(next: Store) {
    if (isControlled) {
      onListingStoreChange!(next);
    } else {
      setInternalStore(next);
    }
    setMainId("");
  }

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="space-y-2">
        <Label>Store</Label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="storeType"
              value="streetwear"
              checked={storeType === "streetwear"}
              onChange={() => switchStore("streetwear")}
              required
            />
            Streetwear
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="storeType"
              value="formal"
              checked={storeType === "formal"}
              onChange={() => switchStore("formal")}
              required
            />
            Formal
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mainCategoryId">Category</Label>
        <select
          id="mainCategoryId"
          name="mainCategoryId"
          value={mainId}
          onChange={(e) => setMainId(e.target.value)}
          required
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select category</option>
          {tree.mains.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
