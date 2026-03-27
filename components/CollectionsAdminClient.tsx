"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  type CollectionRow,
} from "@/actions/collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CollectionsAdminClientProps {
  collections: CollectionRow[];
  initialStoreType: "streetwear" | "formal";
}

export function CollectionsAdminClient({
  collections: initialCollections,
  initialStoreType,
}: CollectionsAdminClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialCollections);
  useEffect(() => {
    setRows(initialCollections);
  }, [initialCollections]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStoreType, setFormStoreType] = useState<"streetwear" | "formal" | "both">("streetwear");
  const [formImage, setFormImage] = useState<File | null>(null);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormStoreType(initialStoreType === "formal" ? "formal" : "streetwear");
    setFormImage(null);
    setEditingId(null);
    setAdding(false);
    setError(null);
  }, [initialStoreType]);

  const startAdd = () => {
    resetForm();
    setFormStoreType(initialStoreType === "formal" ? "formal" : "streetwear");
    setAdding(true);
  };

  const startEdit = (c: CollectionRow) => {
    resetForm();
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormDescription(c.description ?? "");
    setFormStoreType((c.storeType ?? "streetwear") as "streetwear" | "formal" | "both");
    setEditingId(c.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("name", formName);
    formData.set("slug", formSlug);
    formData.set("description", formDescription);
    formData.set("storeType", formStoreType);
    if (formImage) formData.set("image", formImage);

    if (editingId) {
      const result = await updateCollection(editingId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
    } else {
      const result = await createCollection(formData);
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
    const result = await deleteCollection(id);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

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
        <h1 className="text-2xl font-bold">Collections</h1>
        <Button onClick={startAdd} disabled={adding || editingId !== null}>
          Add collection
        </Button>
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Collections are flexible merchandising groups (seasonal drops, sales, staff picks). Products can belong to
        many collections at once. Assign them from each product&apos;s create/edit form.
      </p>

      {(adding || editingId !== null) && (
        <form onSubmit={handleSubmit} className="border border-border rounded-lg p-6 space-y-4 max-w-lg">
          <h2 className="text-lg font-semibold">{editingId ? "Edit collection" : "New collection"}</h2>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="c-name">Name</Label>
            <Input
              id="c-name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Winter 2026"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-slug">Slug (URL)</Label>
            <Input
              id="c-slug"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="winter-2026"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-store">Store</Label>
            <select
              id="c-store"
              value={formStoreType}
              onChange={(e) => setFormStoreType(e.target.value as "streetwear" | "formal" | "both")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="streetwear">Streetwear</option>
              <option value="formal">Formal</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <textarea
              id="c-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Cover image</Label>
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-border rounded p-4 cursor-pointer hover:bg-muted/50"
            >
              <input {...getInputProps()} />
              {formImage ? (
                <p className="text-sm">{formImage.name}</p>
              ) : editingId ? (
                <p className="text-sm text-muted-foreground">Drop new image or click to replace (optional)</p>
              ) : (
                <p className="text-sm text-muted-foreground">Drop image or click to select (optional)</p>
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
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium">Cover</th>
              <th className="text-left p-4 font-medium">Store</th>
              <th className="text-left p-4 font-medium">Name</th>
              <th className="text-left p-4 font-medium">Slug</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-4">
                  <div className="w-14 h-14 relative bg-muted overflow-hidden rounded">
                    {c.imageUrl ? (
                      <Image src={c.imageUrl} alt="" fill className="object-cover" sizes="56px" />
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center justify-center h-full">—</span>
                    )}
                  </div>
                </td>
                <td className="p-4 capitalize">{c.storeType ?? "streetwear"}</td>
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 font-mono text-muted-foreground text-xs">{c.slug}</td>
                <td className="p-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(c)}
                    disabled={adding || editingId !== null}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                  >
                    {deletingId === c.id ? "Deleting…" : "Delete"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No collections yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}
