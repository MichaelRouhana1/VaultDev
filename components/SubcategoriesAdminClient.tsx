"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  type ProductSubcategory,
} from "@/actions/subcategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SubcategoriesAdminClientProps {
  subcategories: ProductSubcategory[];
  initialStoreType: "streetwear" | "formal";
}

export function SubcategoriesAdminClient({
  subcategories: initialSubs,
  initialStoreType,
}: SubcategoriesAdminClientProps) {
  const router = useRouter();
  const [subcategories, setSubcategories] = useState(initialSubs);
  useEffect(() => {
    setSubcategories(initialSubs);
  }, [initialSubs]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formStoreType, setFormStoreType] = useState<"streetwear" | "formal" | "both">(initialStoreType);

  const resetForm = useCallback(() => {
    setFormSlug("");
    setFormLabel("");
    setFormStoreType(initialStoreType);
    setEditingId(null);
    setAdding(false);
    setError(null);
  }, [initialStoreType]);

  const startAdd = () => {
    resetForm();
    setAdding(true);
  };

  const startEdit = (row: ProductSubcategory) => {
    resetForm();
    setFormSlug(row.slug);
    setFormLabel(row.label);
    const rowStore = (row.storeType ?? "both") as "streetwear" | "formal" | "both";
    setFormStoreType(rowStore);
    setEditingId(row.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("slug", formSlug);
    formData.set("label", formLabel);
    formData.set("storeType", formStoreType);

    if (editingId) {
      const result = await updateSubcategory(editingId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
    } else {
      const result = await createSubcategory(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
    }
    resetForm();
    router.refresh();
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const result = await deleteSubcategory(id);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubcategories((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subcategories</h1>
        <Button onClick={startAdd} disabled={adding || editingId !== null}>
          Add Subcategory
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Subcategories are independent tags (e.g. Baggy, Slim). Products pick a category and a subcategory separately. They are not nested under categories.
      </p>

      {error && !(adding || editingId !== null) && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-prose"
        >
          {error}
        </div>
      )}

      {(adding || editingId !== null) && (
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-6 space-y-4 max-w-md">
          <h2 className="text-lg font-semibold">{editingId ? "Edit Subcategory" : "New Subcategory"}</h2>
          {error && (
            <p className="text-sm text-destructive max-w-prose whitespace-pre-wrap">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="sub-slug">Slug (URL-friendly)</Label>
            <Input
              id="sub-slug"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="baggy"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-storeType">Store</Label>
            <select
              id="sub-storeType"
              value={formStoreType}
              onChange={(e) => setFormStoreType(e.target.value as "streetwear" | "formal" | "both")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="streetwear">Streetwear</option>
              <option value="formal">Formal</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-label">Label (display name)</Label>
            <Input
              id="sub-label"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="Baggy"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Save" : "Add"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium">Store</th>
              <th className="text-left p-4 font-medium">Slug</th>
              <th className="text-left p-4 font-medium">Label</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subcategories.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="p-4 capitalize">{row.storeType ?? "streetwear"}</td>
                <td className="p-4 font-mono text-muted-foreground">{row.slug}</td>
                <td className="p-4">{row.label}</td>
                <td className="p-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(row)}
                    disabled={adding || editingId !== null}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => handleDelete(row.id)}
                    disabled={deletingId === row.id}
                  >
                    {deletingId === row.id ? "Deleting…" : "Delete"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subcategories.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No subcategories yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}
