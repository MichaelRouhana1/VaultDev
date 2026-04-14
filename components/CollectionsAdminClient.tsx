"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
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
import { ImageCropModal } from "@/components/ImageCropModal";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { toast } from "sonner";
import { adminImageDropzoneAccept } from "@/lib/image-upload-accept";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-limits";
import { adminListingStoreTypeLabel } from "@/lib/store-type-display";
import { uploadImageFileViaPresign } from "@/lib/upload-image-presigned-client";

/** Same as product card / ProductImageUpload. */
const COLLECTION_COVER_ASPECT = 2 / 3;

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
  const [cropObjectUrl, setCropObjectUrl] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormStoreType(initialStoreType === "formal" ? "formal" : "streetwear");
    setFormImage(null);
    setCropObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
    if (formImage) {
      const up = await uploadImageFileViaPresign(formImage, "product-images");
      if ("error" in up) {
        setError(up.error);
        return;
      }
      formData.set("imageUrl", up.publicUrl);
    }

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

  const handleCoverDrop = useCallback((files: File[]) => {
    const raw = files[0];
    if (!raw) return;
    void (async () => {
      try {
        const file = await ensureBrowserDisplayableImage(raw);
        setCropObjectUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
      } catch {
        toast.error("Could not load image. For HEIC/HEIF, try again or use JPEG or PNG.");
      }
    })();
  }, []);

  const handleCollectionCropComplete = useCallback((blob: Blob) => {
    setCropObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFormImage(new File([blob], "collection-cover.jpg", { type: "image/jpeg" }));
  }, []);

  const handleCollectionCropCancel = useCallback(() => {
    setCropObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleCoverDrop,
    accept: adminImageDropzoneAccept,
    maxSize: MAX_IMAGE_UPLOAD_BYTES,
    maxFiles: 1,
    disabled: (!adding && editingId === null) || !!cropObjectUrl,
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
              <option value="formal">Classic</option>
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
            <p className="text-xs text-muted-foreground">Crop to 2:3 — same framing as product cards.</p>
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-border rounded p-4 cursor-pointer hover:bg-muted/50"
            >
              <input {...getInputProps()} />
              {formImage ? (
                <p className="text-sm">{formImage.name} (cropped)</p>
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
                <td className="p-4">{adminListingStoreTypeLabel(c.storeType)}</td>
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

      {cropObjectUrl && (
        <ImageCropModal
          imageSrc={cropObjectUrl}
          onComplete={handleCollectionCropComplete}
          onCancel={handleCollectionCropCancel}
          aspect={COLLECTION_COVER_ASPECT}
          title="Crop image (2:3 product card ratio)"
        />
      )}
    </div>
  );
}
