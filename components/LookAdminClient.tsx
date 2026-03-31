"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useDropzone } from "react-dropzone";
import Cropper, { type Area } from "react-easy-crop";
import { addLookbookItemFromFile, deleteLookbookItem, setLookbookSectionVisible } from "@/actions/lookbook";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { LookbookItem } from "@/db/schema";

/** Matches Get the Look display: aspect 3/4 */
const LOOK_ASPECT = 3 / 4;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.9);
  });
}

interface LookAdminClientProps {
  items: LookbookItem[];
  sectionVisible: boolean;
  initialStoreType: "streetwear" | "formal";
}

export function LookAdminClient({ items: initialItems, sectionVisible: initialSectionVisible, initialStoreType }: LookAdminClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cropFile, setCropFile] = useState<{
    file: File;
    objectUrl: string;
    label: string;
    href: string;
    storeType: "streetwear" | "formal" | "both";
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const cropFileRef = useRef<typeof cropFile>(null);
  cropFileRef.current = cropFile;
  const [sectionVisible, setSectionVisible] = useState(initialSectionVisible);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setSectionVisible(initialSectionVisible);
  }, [initialSectionVisible]);

  const handleSectionVisibilityChange = useCallback(
    async (checked: boolean) => {
      setSectionVisible(checked);
      await setLookbookSectionVisible(checked);
      router.refresh();
    },
    [router]
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length < 1) return;
    void (async () => {
      try {
        const file = await ensureBrowserDisplayableImage(acceptedFiles[0]);
        const url = URL.createObjectURL(file);
        setCropFile({ file, objectUrl: url, label: "", href: "/shop", storeType: initialStoreType });
      } catch {
        toast.error("Could not load image. For HEIC/HEIF, try again or use JPEG or PNG.");
      }
    })();
  }, [initialStoreType]);

  const handleCropComplete = useCallback(
    async (blob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
      const { label, href, storeType } = current;
      if (!label.trim()) {
        console.error("Label is required");
        return;
      }
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);

      const file = new File([blob], current.file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });

      setIsAdding(true);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("label", label.trim());
      formData.append("href", (href || "/shop").trim());
      formData.append("storeType", storeType);
      const result = await addLookbookItemFromFile(formData);
      setIsAdding(false);

      if (result.error) {
        console.error(result.error);
        return;
      }
      router.refresh();
    },
    [router]
  );

  const handleCropCancel = useCallback(() => {
    const current = cropFileRef.current;
    if (current) {
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      setDeletingId(id);
      await deleteLookbookItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeletingId(null);
      router.refresh();
    },
    [router]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: !!cropFile || isAdding,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Get the Look</h1>
          <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full capitalize">
            Managing: {initialStoreType}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <Checkbox
              checked={sectionVisible}
              onCheckedChange={(checked) => handleSectionVisibilityChange(!!checked)}
            />
            Show section on home page
          </label>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button
              type="button"
              disabled={!!cropFile || isAdding}
              className="cursor-pointer"
            >
              {isAdding ? "Adding…" : "Add Look"}
            </Button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
          <p className="mb-4">No items found for this store. Add your first <span className="capitalize">{initialStoreType}</span> item.</p>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" type="button" className="cursor-pointer">
              Add your first look
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group overflow-hidden rounded-lg border border-border bg-muted"
            >
              <div className="aspect-[3/4] relative">
                <Image
                  src={item.imageUrl}
                  alt={item.label}
                  fill
                  className="object-cover"

                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </div>
              <div className="p-3 text-sm font-normal text-foreground flex flex-col gap-1">
                <span className="truncate">{item.label}</span>
                <span className="text-xs uppercase opacity-60">{item.storeType}</span>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cropFile && (
        <LookAddModal
          cropFile={cropFile}
          onLabelChange={(label) =>
            setCropFile((prev) => (prev ? { ...prev, label } : null))
          }
          onHrefChange={(href) =>
            setCropFile((prev) => (prev ? { ...prev, href } : null))
          }
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

interface LookAddModalProps {
  cropFile: { file: File; objectUrl: string; label: string; href: string; storeType: "streetwear" | "formal" | "both" };
  onLabelChange: (label: string) => void;
  onHrefChange: (href: string) => void;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
}

function LookAddModal({
  cropFile,
  onLabelChange,
  onHrefChange,
  onComplete,
  onCancel,
}: LookAddModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    if (!cropFile.label.trim()) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(cropFile.objectUrl, croppedAreaPixels);
      onComplete(blob);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden border border-border rounded-lg">
        <div className="p-4 border-b border-border flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              Category name
            </label>
            <Input
              placeholder="e.g. Street, Everyday"
              value={cropFile.label}
              onChange={(e) => onLabelChange(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              Link
            </label>
            <Input
              placeholder="/shop"
              value={cropFile.href}
              onChange={(e) => onHrefChange(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs uppercase border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels || !cropFile.label.trim()}
              className="px-4 py-2 text-xs uppercase bg-foreground text-background disabled:opacity-50"
            >
              {processing ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
        <div className="relative flex-1 min-h-[400px]">
          <Cropper
            image={cropFile.objectUrl}
            crop={crop}
            zoom={zoom}
            aspect={LOOK_ASPECT}
            zoomSpeed={0.1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropAreaChange={onCropComplete}
            objectFit="contain"
          />
        </div>
      </div>
    </div>
  );
}
