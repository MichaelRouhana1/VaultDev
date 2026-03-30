"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateProduct } from "@/actions/updateProduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageCropModal } from "@/components/ImageCropModal";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Product, ProductVariant, ProductColor } from "@/db/schema";
import type { ProductFormCategoryTree } from "@/actions/categories";
import type { AttributeWithValues } from "@/actions/attributes";
import { ProductTaxonomyFields } from "@/components/admin/ProductTaxonomyFields";
import { ProductAttributeFields } from "@/components/admin/ProductAttributeFields";
import {
  ProductCollectionsFields,
  type CollectionOption,
} from "@/components/admin/ProductCollectionsFields";
import { InventoryManager } from "@/components/admin/InventoryManager";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

interface ColorEntry {
  id: string | number;
  name: string;
  hexCode: string;
  imageUrls: string[];
  imageFiles: File[];
  stockBySize: Record<string, number>;
}

function toColorEntry(c: ProductColor, variants: ProductVariant[]): ColorEntry {
  const stockBySize: Record<string, number> = {};
  for (const s of SIZES) {
    const v = variants.find((x) => x.colorId === c.id && x.size === s);
    stockBySize[s] = v?.stock ?? 0;
  }
  return {
    id: c.id,
    name: c.name,
    hexCode: c.hexCode ?? "#000000",
    imageUrls: c.imageUrls ?? [],
    imageFiles: [],
    stockBySize,
  };
}

type ListingStore = "streetwear" | "formal";

export function EditProductForm({
  product,
  variants = [],
  colors = [],
  categoryTrees,
  collectionsByStore,
  initialCollectionIds,
  attributesWithValues,
  initialAttributeValueIds,
}: {
  product: Product & { images?: string[] };
  variants?: ProductVariant[];
  colors?: ProductColor[];
  categoryTrees: Record<ListingStore, ProductFormCategoryTree>;
  collectionsByStore: Record<ListingStore, CollectionOption[]>;
  initialCollectionIds: number[];
  attributesWithValues: AttributeWithValues[];
  initialAttributeValueIds: number[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialListing: ListingStore = product.storeType === "formal" ? "formal" : "streetwear";
  const [listingStore, setListingStore] = useState<ListingStore>(initialListing);
  const [collectionIds, setCollectionIds] = useState<number[]>(() => [...initialCollectionIds]);
  const skipClearCollectionsRef = useRef(true);
  useEffect(() => {
    if (skipClearCollectionsRef.current) {
      skipClearCollectionsRef.current = false;
      return;
    }
    setCollectionIds([]);
  }, [listingStore]);
  const [colorsState, setColorsState] = useState<ColorEntry[]>(() =>
    colors.length > 0
      ? colors.map((c) => toColorEntry(c, variants))
      : [
        {
          id: crypto.randomUUID(),
          name: (product as { color?: string | null }).color ?? "Default",
          hexCode: "#000000",
          imageUrls: (product.images ?? []) as string[],
          imageFiles: [],
          stockBySize: SIZES.reduce<Record<string, number>>((acc, s) => {
            const v = variants.find((x) => x.size === s);
            acc[s] = v?.stock ?? 0;
            return acc;
          }, {}),
        },
      ]
  );
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const addColor = () => {
    setColorsState((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        hexCode: "#000000",
        imageUrls: [],
        imageFiles: [],
        stockBySize: Object.fromEntries(SIZES.map((s) => [s, 0])),
      },
    ]);
  };

  const removeColor = (id: string | number) => {
    setColorsState((prev) => prev.filter((c) => c.id !== id));
  };

  const updateColor = (id: string | number, updates: Partial<Omit<ColorEntry, "id">>) => {
    setColorsState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const addFilesToColor = (id: string | number, files: File[]) => {
    setColorsState((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, imageFiles: [...c.imageFiles, ...files] } : c
      )
    );
  };

  const removeFileFromColor = (colorId: string | number, fileIndex: number) => {
    setColorsState((prev) =>
      prev.map((c) =>
        c.id === colorId
          ? { ...c, imageFiles: c.imageFiles.filter((_, i) => i !== fileIndex) }
          : c
      )
    );
  };

  const removeExistingImageFromColor = (colorId: string | number, urlIndex: number) => {
    setColorsState((prev) =>
      prev.map((c) =>
        c.id === colorId
          ? { ...c, imageUrls: c.imageUrls.filter((_, i) => i !== urlIndex) }
          : c
      )
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;

    if (colorsState.length === 0) {
      setState({ error: "Add at least one color" });
      return;
    }

    const invalidColors = colorsState.filter((c) => !c.name.trim());
    if (invalidColors.length > 0) {
      setState({ error: "Each color must have a name" });
      return;
    }

    setIsPending(true);
    setState(null);

    const formData = new FormData(formRef.current);
    collectionIds.forEach((id) => formData.append("collectionIds", String(id)));
    formData.set("color_count", String(colorsState.length));
    colorsState.forEach((color, i) => {
      formData.set(`color_${i}_id`, String(color.id));
      formData.set(`color_${i}_name`, color.name.trim());
      formData.set(`color_${i}_hex`, color.hexCode || "#000000");
      formData.set(`color_${i}_existing_urls`, JSON.stringify(color.imageUrls));
      color.imageFiles.forEach((file) => {
        formData.append(`color_${i}_images`, file);
      });
      SIZES.forEach((size) => {
        formData.set(`color_${i}_stock_${size}`, String(color.stockBySize[size] ?? 0));
      });
    });

    const result = await updateProduct(product.id, formData);
    setState(result);
    setIsPending(false);
    if (!result.error) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  const price = typeof product.price === "string" ? product.price : String(product.price);

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit product</CardTitle>
          <CardDescription>Update product details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Product name"
              defaultValue={product.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Product description"
              defaultValue={product.description ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                defaultValue={price}
              />
            </div>
            <ProductTaxonomyFields
              categoryTrees={categoryTrees}
              initialStoreType={initialListing}
              initialMainCategoryId={product.mainCategoryId}
              listingStore={listingStore}
              onListingStoreChange={setListingStore}
            />
            <ProductCollectionsFields
              collectionsByStore={collectionsByStore}
              listingStore={listingStore}
              selectedIds={collectionIds}
              onChange={setCollectionIds}
            />
          </div>
          <ProductAttributeFields
            attributesWithValues={attributesWithValues}
            initialSelectedIds={initialAttributeValueIds}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVisible"
              name="isVisible"
              value="true"
              defaultChecked={product.isVisible}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isVisible" className="font-normal">
              Visible in store
            </Label>
          </div>

          {/* Color Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Colors</h3>
                <p className="text-xs text-muted-foreground">
                  Add colors with their own images and stock levels
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addColor}>
                Add color
              </Button>
            </div>

            {colorsState.map((color) => (
              <EditColorRow
                key={String(color.id)}
                color={color}
                sizes={SIZES}
                onUpdate={(updates) => updateColor(color.id, updates)}
                onRemove={() => removeColor(color.id)}
                onAddFiles={(files) => addFilesToColor(color.id, files)}
                onRemoveFile={(idx) => removeFileFromColor(color.id, idx)}
                onRemoveExistingImage={(idx) => removeExistingImageFromColor(color.id, idx)}
                canRemove={colorsState.length > 1}
              />
            ))}

            {colorsState.length === 0 && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No colors added yet. Add at least one color to continue.
                </p>
                <Button type="button" variant="outline" onClick={addColor}>
                  Add first color
                </Button>
              </div>
            )}
          </div>

          {/* Legacy fixed-size inventory grid (edit flow; dynamic options matrix is on create for now) */}
          {colorsState.length > 0 && (
            <section className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
              <header className="border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Inventory matrix</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Stock per color and fixed sizes (XS–XL). Bulk quantity applies to every cell.
                </p>
              </header>
              <div className="p-4 sm:p-5">
                <InventoryManager
                  embedded
                  colors={colorsState}
                  sizes={SIZES}
                  updateColor={updateColor}
                />
              </div>
            </section>
          )}

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex gap-4">
            <Button type="submit" disabled={isPending || colorsState.length === 0}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/products")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

interface EditColorRowProps {
  color: ColorEntry;
  sizes: readonly string[];
  onUpdate: (updates: Partial<Omit<ColorEntry, "id">>) => void;
  onRemove: () => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExistingImage: (index: number) => void;
  canRemove: boolean;
}

function EditColorRow({
  color,
  onUpdate,
  onRemove,
  onAddFiles,
  onRemoveFile,
  onRemoveExistingImage,
  canRemove,
}: EditColorRowProps) {
  const [cropPending, setCropPending] = useState<{ file: File; objectUrl: string } | null>(null);
  const cropQueueRef = useRef<File[]>([]);

  const processNextInQueue = useCallback(() => {
    void (async () => {
      const next = cropQueueRef.current.shift();
      if (!next) {
        setCropPending(null);
        return;
      }
      try {
        const file = await ensureBrowserDisplayableImage(next);
        setCropPending({ file, objectUrl: URL.createObjectURL(file) });
      } catch {
        toast.error("Could not load image. For HEIC/HEIF, try again or use JPEG or PNG.");
        processNextInQueue();
      }
    })();
  }, []);

  const handleCropComplete = useCallback(
    (blob: Blob) => {
      const current = cropPending;
      if (!current) return;
      URL.revokeObjectURL(current.objectUrl);
      setCropPending(null);
      const file = new File([blob], current.file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
      onAddFiles([file]);
      processNextInQueue();
    },
    [cropPending, onAddFiles, processNextInQueue]
  );

  const handleCropCancel = useCallback(() => {
    if (cropPending) {
      URL.revokeObjectURL(cropPending.objectUrl);
      setCropPending(null);
    }
    processNextInQueue();
  }, [cropPending, processNextInQueue]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      cropQueueRef.current.push(...acceptedFiles);
      if (!cropPending) processNextInQueue();
    },
    [cropPending, processNextInQueue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"] },
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Color name</Label>
            <Input
              placeholder="e.g. Midnight Black"
              value={color.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hex code</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color.hexCode}
                onChange={(e) => onUpdate({ hexCode: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <Input
                value={color.hexCode}
                onChange={(e) => onUpdate({ hexCode: e.target.value })}
                placeholder="#000000"
                className="font-mono"
              />
            </div>
          </div>
        </div>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            Remove
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Images (this color only)</Label>
        {color.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {color.imageUrls.map((url, i) => (
              <div
                key={i}
                className="relative w-20 h-20 rounded overflow-hidden bg-muted shrink-0 group"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"

                />
                <button
                  type="button"
                  onClick={() => onRemoveExistingImage(i)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          {...getRootProps()}
          className={cn(
            "border-input flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          <p className="text-center text-sm text-muted-foreground">
            {isDragActive ? "Drop images here…" : "Drag & drop or click to add images"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, GIF up to 5MB (crop 2:3)</p>
        </div>
        {color.imageFiles.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {color.imageFiles.map((file, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                {file.name}
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="text-destructive hover:underline"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {cropPending && (
        <ImageCropModal
          imageSrc={cropPending.objectUrl}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={2 / 3}
          title="Crop image (2:3 product ratio)"
        />
      )}
    </div>
  );
}
