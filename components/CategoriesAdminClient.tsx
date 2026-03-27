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
import { cn } from "@/lib/utils";

function categoryKind(cat: ProductCategory): "Root" | "Main" | "Sub" {
  if (cat.level === "root") return "Root";
  if (cat.parentId != null) return "Sub";
  return "Main";
}

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formShowOnHome, setFormShowOnHome] = useState(false);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formStoreType, setFormStoreType] = useState<"streetwear" | "formal" | "both">(initialStoreType);
  const [formParentId, setFormParentId] = useState("");

  const resetForm = useCallback(() => {
    setFormSlug("");
    setFormLabel("");
    setFormShowOnHome(false);
    setFormImage(null);
    setFormStoreType(initialStoreType);
    setFormParentId("");
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
    setFormParentId(cat.parentId != null ? String(cat.parentId) : "");
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
    formData.set("parentId", formParentId);
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

  const showOnHomeCount = categories.filter((c) => c.showOnHome).length;
  const showOnHomeDisabled = showOnHomeCount >= 6 && !formShowOnHome;

  const [sortByHomeFirst, setSortByHomeFirst] = useState(false);
  const sortedCategories = useMemo(() => {
    if (!sortByHomeFirst) return categories;
    return [...categories].sort((a, b) => {
      if (a.showOnHome === b.showOnHome) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      return a.showOnHome ? -1 : 1;
    });
  }, [categories, sortByHomeFirst]);

  const editingRow = useMemo(
    () => (editingId !== null ? categories.find((c) => c.id === editingId) ?? null : null),
    [categories, editingId],
  );
  const isEditingRoot = editingRow?.level === "root";

  const mainCategoryOptions = useMemo(() => {
    const base = categories.filter(
      (c) =>
        c.parentId == null &&
        c.level === "main" &&
        (c.storeType === "both" || c.storeType === formStoreType),
    );
    const byId = new Map(base.map((c) => [c.id, c]));
    if (formParentId) {
      const pid = Number(formParentId);
      const p = categories.find((c) => c.id === pid);
      if (p && !byId.has(p.id)) base.push(p);
    }
    return [...base].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [categories, formStoreType, formParentId]);

  useEffect(() => {
    if (!formParentId) return;
    const pid = Number(formParentId);
    const p = categories.find((c) => c.id === pid);
    if (!p || (p.storeType !== "both" && p.storeType !== formStoreType)) {
      setFormParentId("");
    }
  }, [formStoreType, formParentId, categories]);

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
        Categories shown on the home page are limited to 6. Use &quot;Show on home&quot; to control which appear there.
        All categories appear in the burger menu.
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
            <Label htmlFor="parentId">Parent category (optional)</Label>
            <select
              id="parentId"
              value={formParentId}
              onChange={(e) => setFormParentId(e.target.value)}
              disabled={isEditingRoot}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{isEditingRoot ? "—" : "None — main category"}</option>
              {mainCategoryOptions.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.label}
                </option>
              ))}
            </select>
            {isEditingRoot ? (
              <p className="text-xs text-muted-foreground">Store roots cannot have a parent.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Choose a parent to create or move a row under a main category (subcategory).
              </p>
            )}
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
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"

                        sizes="48px"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                    )}
                  </div>
                </td>
                <td className="p-4 capitalize">{cat.storeType ?? "streetwear"}</td>
                <td className="p-4">
                  <span
                    className={cn(
                      "inline-block text-xs font-medium rounded px-2 py-0.5 capitalize",
                      categoryKind(cat) === "Sub" && "bg-muted text-foreground",
                      categoryKind(cat) === "Main" && "bg-secondary text-secondary-foreground",
                      categoryKind(cat) === "Root" && "bg-primary/15 text-foreground",
                    )}
                  >
                    {categoryKind(cat)}
                  </span>
                </td>
                <td className="p-4 font-mono text-muted-foreground">{cat.slug}</td>
                <td className={cn("p-4", cat.parentId != null && "pl-10 border-l border-border/60")}>
                  {cat.parentId != null && (
                    <span className="text-muted-foreground mr-2 select-none" aria-hidden>
                      └
                    </span>
                  )}
                  {cat.label}
                </td>
                <td className="p-4">{cat.showOnHome ? "Yes" : "No"}</td>
                <td className="p-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(cat)}
                    disabled={adding || editingId !== null}
                  >
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
        {categories.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            No categories yet. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
