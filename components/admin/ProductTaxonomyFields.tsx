"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductFormCategoryTree } from "@/actions/categories";
import { LISTING_STORES, type ListingStore } from "@/lib/store-scope";
import { storeTypeLabelEn } from "@/lib/store-type-display";

type Store = ListingStore;

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
  const [categoryError, setCategoryError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onSubmit = (event: Event) => {
      if (mainId) return;
      event.preventDefault();
      event.stopPropagation();
      setCategoryError(true);
      triggerRef.current?.focus();
    };
    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [mainId]);

  function switchStore(next: Store) {
    if (isControlled) {
      onListingStoreChange!(next);
    } else {
      setInternalStore(next);
    }
    setMainId("");
    setCategoryError(false);
  }

  function selectCategory(next: string) {
    setMainId(next);
    setCategoryError(false);
  }

  return (
    <div ref={rootRef} className="space-y-4 sm:col-span-2">
      <div className="space-y-2">
        <Label>Store</Label>
        <div className="flex flex-wrap gap-6">
          {LISTING_STORES.map((store) => (
            <label key={store} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="storeType"
                value={store}
                checked={storeType === store}
                onChange={() => switchStore(store)}
                required
              />
              {storeTypeLabelEn(store)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mainCategoryId">Category</Label>
        <input type="hidden" name="mainCategoryId" value={mainId} />
        <Select value={mainId} onValueChange={selectCategory}>
          <SelectTrigger
            ref={triggerRef}
            id="mainCategoryId"
            aria-invalid={categoryError || undefined}
            aria-describedby={categoryError ? "mainCategoryId-error" : undefined}
            className="w-full"
          >
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4} className="!max-h-72">
            {tree.mains.length === 0 ? (
              <SelectItem value="__empty" disabled>
                No categories for this store
              </SelectItem>
            ) : (
              tree.mains.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {categoryError ? (
          <p id="mainCategoryId-error" className="text-sm text-destructive">
            Select a category
          </p>
        ) : null}
      </div>
    </div>
  );
}
