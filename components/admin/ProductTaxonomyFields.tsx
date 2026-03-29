"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AddSubcategoryDialog } from "@/components/admin/AddSubcategoryDialog";
import type { ProductFormCategoryTree } from "@/actions/categories";

type Store = "streetwear" | "formal";

export function ProductTaxonomyFields({
  categoryTrees,
  initialStoreType,
  initialMainCategoryId,
  initialSubcategoryId,
  listingStore,
  onListingStoreChange,
}: {
  categoryTrees: Record<Store, ProductFormCategoryTree>;
  initialStoreType: Store;
  initialMainCategoryId?: number;
  initialSubcategoryId?: number | null;
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
  const [subId, setSubId] = useState(
    initialSubcategoryId != null ? String(initialSubcategoryId) : "",
  );
  const [addSubcategoryOpen, setAddSubcategoryOpen] = useState(false);
  const router = useRouter();

  async function handleSubcategoryCreated(id: number) {
    await router.refresh();
    setSubId(String(id));
  }

  function switchStore(next: Store) {
    if (isControlled) {
      onListingStoreChange!(next);
    } else {
      setInternalStore(next);
    }
    setMainId("");
    setSubId("");
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

      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="subcategoryId" className="flex-1">
            Subcategory
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setAddSubcategoryOpen(true)}
            aria-label="Add new subcategory"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <select
          id="subcategoryId"
          name="subcategoryId"
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{tree.subs.length === 0 ? "No subcategories yet" : "Optional — none"}</option>
          {tree.subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Subcategories are independent of category (e.g. the same fit can apply to multiple product types).
        </p>
        <AddSubcategoryDialog
          open={addSubcategoryOpen}
          onOpenChange={setAddSubcategoryOpen}
          listingStore={storeType}
          onCreated={handleSubcategoryCreated}
        />
      </div>
    </div>
  );
}
