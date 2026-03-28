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

interface SubcategoriesAdminClientProps {
  subcategories: ProductCategory[];
  mainCategories: ProductCategory[];
  initialStoreType: "streetwear" | "formal";
}

export function SubcategoriesAdminClient({
  subcategories: initialSubs,
  mainCategories,
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
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formStoreType, setFormStoreType] = useState<"streetwear" | "formal" | "both">(initialStoreType);
  const [formParentId, setFormParentId] = useState("");

  const mainById = useMemo(() => Object.fromEntries(mainCategories.map((m) => [m.id, m])), [mainCategories]);

  const resetForm = useCallback(() => {
    setFormSlug("");
    setFormLabel("");
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
    const catStoreType = (cat.storeType ?? "both") as "streetwear" | "formal" | "both";
    setFormStoreType(catStoreType);
    setFormParentId(cat.parentId != null ? String(cat.parentId) : "");
    setEditingId(cat.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formParentId) {
      setError("Select a main category.");
      return;
    }
    const formData = new FormData();
    formData.set("slug", formSlug);
    formData.set("label", formLabel);
    formData.set("showOnHome", "false");
    formData.set("storeType", formStoreType);
    formData.set("parentId", formParentId);
    formData.set("level", "sub");
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
    setSubcategories((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  const mainCategoryOptions = useMemo(() => {
    return [...mainCategories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [mainCategories]);

  useEffect(() => {
    if (!formParentId) return;
    const pid = Number(formParentId);
    const p = mainCategories.find((c) => c.id === pid);
    if (!p || (p.storeType !== "both" && p.storeType !== formStoreType)) {
      setFormParentId("");
    }
  }, [formStoreType, formParentId, mainCategories]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (files) => files[0] && setFormImage(files[0]),
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: !adding && editingId === null,
  });

  const rows = useMemo(
    () => subcategories.filter((c) => c.parentId != null),
    [subcategories],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subcategories</h1>
        <Button onClick={startAdd} disabled={adding || editingId !== null}>
          Add Subcategory
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Subcategories belong to a main category and never appear on the home page. Manage top-level categories under{" "}
        <span className="font-medium text-foreground">Categories</span>.
      </p>

      {(adding || editingId !== null) && (
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-6 space-y-4 max-w-md">
          <h2 className="text-lg font-semibold">{editingId ? "Edit Subcategory" : "New Subcategory"}</h2>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="sub-slug">Slug (URL-friendly)</Label>
            <Input
              id="sub-slug"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="skinny-jeans"
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
            <Label htmlFor="sub-parentId">Parent category (main)</Label>
            <select
              id="sub-parentId"
              value={formParentId}
              onChange={(e) => setFormParentId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                Select a main category
              </option>
              {mainCategoryOptions
                .filter((m) => m.storeType === "both" || m.storeType === formStoreType)
                .map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-label">Label (display name)</Label>
            <Input
              id="sub-label"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              placeholder="Skinny jeans"
              required
            />
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
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium">Image</th>
              <th className="text-left p-4 font-medium">Store</th>
              <th className="text-left p-4 font-medium">Parent</th>
              <th className="text-left p-4 font-medium">Slug</th>
              <th className="text-left p-4 font-medium">Label</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cat) => (
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
                <td className="p-4 text-muted-foreground">
                  {cat.parentId != null ? mainById[cat.parentId]?.label ?? "—" : "—"}
                </td>
                <td className="p-4 font-mono text-muted-foreground">{cat.slug}</td>
                <td className="p-4">{cat.label}</td>
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
        {rows.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No subcategories yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}
