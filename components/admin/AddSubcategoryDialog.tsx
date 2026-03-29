"use client";

import { useState, useEffect } from "react";
import { createSubcategory } from "@/actions/subcategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type ListingStore = "streetwear" | "formal";
type SubStore = ListingStore | "both";

interface AddSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Defaults the Store field to match the product listing store. */
  listingStore: ListingStore;
  onCreated: (id: number) => void | Promise<void>;
}

export function AddSubcategoryDialog({
  open,
  onOpenChange,
  listingStore,
  onCreated,
}: AddSubcategoryDialogProps) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [storeType, setStoreType] = useState<SubStore>(listingStore);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSlug("");
    setLabel("");
    setStoreType(listingStore);
    setFormError(null);
  }, [open, listingStore]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("label", label);
    formData.set("storeType", storeType);
    const result = await createSubcategory(formData);
    setPending(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (result.id == null) {
      setFormError("Could not create subcategory.");
      return;
    }
    onOpenChange(false);
    toast.success("Subcategory added");
    await Promise.resolve(onCreated(result.id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Subcategory</DialogTitle>
            <DialogDescription>
              Add a fit or style tag. It appears in the subcategory list for the stores you select.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {formError && (
              <p className="text-sm text-destructive whitespace-pre-wrap" role="alert">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-sub-slug">Slug (URL-friendly)</Label>
              <Input
                id="new-sub-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="baggy"
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-sub-store">Store</Label>
              <select
                id="new-sub-store"
                value={storeType}
                onChange={(e) => setStoreType(e.target.value as SubStore)}
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="streetwear">Streetwear</option>
                <option value="formal">Formal</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-sub-label">Label (display name)</Label>
              <Input
                id="new-sub-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Baggy"
                required
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
