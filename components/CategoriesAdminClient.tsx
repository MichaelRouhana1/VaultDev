"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type ProductCategory,
} from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface CategoriesAdminClientProps {
  categories: ProductCategory[];
  initialStoreType: "streetwear" | "formal";
}

export function CategoriesAdminClient({ categories: initialCategories, initialStoreType }: CategoriesAdminClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const mainRows = useMemo(() => categories.filter((c) => c.level === "main"), [categories]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formShowOnHome, setFormShowOnHome] = useState(false);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formStoreType, setFormStoreType] = useState<"streetwear" | "formal" | "both">(initialStoreType);

  const resetForm = useCallback(() => {
    setFormSlug("");
    setFormLabel("");
    setFormShowOnHome(false);
    setFormImage(null);
    setFormStoreType(initialStoreType);
    setEditingId(null);
    setAdding(false);
    setError(null);
  }, [initialStoreType]);

  const startAdd = () => {
    resetForm();
    setAdding(true);
  };

  const startEdit = (cat: ProductCategory) => {
    resetForm();
    setFormSlug(cat.slug);
    setFormLabel(cat.label);
    setFormShowOnHome(cat.showOnHome);
    const catStoreType = (cat.storeType ?? "both") as "streetwear" | "formal" | "both";
    setFormStoreType(catStoreType);
    setEditingId(cat.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("slug", formSlug);
    formData.set("label", formLabel);
    formData.set("showOnHome", String(formShowOnHome));
    formData.set("storeType", formStoreType);
    formData.set("level", "main");
    if (formImage) formData.set("image", formImage);

    if (editingId) {
      const result = await updateCategory(editingId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
    } else {
      const result = await createCategory(formData);
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
    const result = await deleteCategory(id);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  const showOnHomeCount = mainRows.filter((c) => c.showOnHome).length;
  const showOnHomeDisabled = showOnHomeCount >= 6 && !formShowOnHome;

  const [sortByHomeFirst, setSortByHomeFirst] = useState(false);
  const sortedCategories = useMemo(() => {
    if (!sortByHomeFirst) return mainRows;
    return [...mainRows].sort((a, b) => {
      if (a.showOnHome === b.showOnHome) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      return a.showOnHome ? -1 : 1;
    });
  }, [mainRows, sortByHomeFirst]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => files[0] && setFormImage(files[0]),
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: !adding && editingId === null,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Categories</h1>
        <Button onClick={startAdd} disabled={adding || editingId !== null}>
          Add Category
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Main categories control the home page (max 6 with &quot;Show on home&quot;) and top-level shop navigation. Subcategories are managed under{" "}
        <span className="font-medium text-foreground">Subcategories</span>.
      </p>

      {(adding || editingId !== null) && (
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-6 space-y-4 max-w-md">
          <h2 className="text-lg font-semibold">{editingId ? "Edit Category" : "New Category"}</h2>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL-friendly, e.g. trousers)</Label>
            <Input
              id="slug"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="trousers"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storeType">Store</Label>
            <select
              id="storeType"
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
            <Label htmlFor="label">Label (display name)</Label>
            <Input
              id="label"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="Trousers"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showOnHome"
              checked={formShowOnHome}
              onCheckedChange={(c) => !showOnHomeDisabled && setFormShowOnHome(!!c)}
              disabled={showOnHomeDisabled}
            />
            <Label
              htmlFor="showOnHome"
              className={showOnHomeDisabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}
            >
              Show on home page (max 6{showOnHomeDisabled ? ", limit reached" : ""})
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div {...getRootProps()} className="border-2 border-dashed border-border rounded p-4 cursor-pointer hover:bg-muted/50">
              <input {...getInputProps()} />
              {formImage ? (
                <p className="text-sm">{formImage.name}</p>
              ) : editingId ? (
                <p className="text-sm text-muted-foreground">Drop new image or click to replace (optional)</p>
              ) : (
                <p className="text-sm text-muted-foreground">Drop image or click to select</p>
              )}
            </div>
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
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium">Image</th>
              <th className="text-left p-4 font-medium">Store</th>
              <th className="text-left p-4 font-medium">Type</th>
              <th className="text-left p-4 font-medium">Slug</th>
              <th className="text-left p-4 font-medium">Label</th>
              <th
                className="text-left p-4 font-medium cursor-pointer hover:bg-muted/80 select-none"
                onClick={() => setSortByHomeFirst((prev) => !prev)}
                title={sortByHomeFirst ? "Click to restore default order" : "Click to show Home=Yes first"}
              >
                Home {sortByHomeFirst && "↓"}
              </th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((cat) => (
              <tr key={cat.id} className="border-t border-border">
                <td className="p-4">
                  <div className="w-12 h-16 relative bg-muted overflow-hidden">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.label} fill className="object-cover" sizes="48px" />
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                    )}
                  </div>
                </td>
                <td className="p-4 capitalize">{cat.storeType ?? "streetwear"}</td>
                <td className="p-4">
                  <span className="inline-block text-xs font-medium rounded px-2 py-0.5 capitalize bg-secondary text-secondary-foreground">
                    Main
                  </span>
                </td>
                <td className="p-4 font-mono text-muted-foreground">{cat.slug}</td>
                <td className="p-4">{cat.label}</td>
                <td className="p-4">{cat.showOnHome ? "Yes" : "No"}</td>
                <td className="p-4 text-right">
                  <Button variant="outline" size="sm" onClick={() => startEdit(cat)} disabled={adding || editingId !== null}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                  >
                    {deletingId === cat.id ? "Deleting…" : "Delete"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mainRows.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No main categories yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}
