"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useDropzone } from "react-dropzone";
import { DualImageCropModal } from "@/components/admin/DualImageCropModal";
import { addLookbookItemFromFile, deleteLookbookItem, setLookbookSectionVisible } from "@/actions/lookbook";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { adminImageDropzoneAccept } from "@/lib/image-upload-accept";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-limits";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { LookbookItem } from "@/db/schema";

/** Matches Get the Look card display (desktop grid). */
const LOOK_DESKTOP_ASPECT = 3 / 4;
/** Taller crop for storefront mobile. */
const LOOK_MOBILE_ASPECT = 9 / 16;

function MobileCropPreview({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) {
    return (
      <div
        className="flex h-20 w-10 shrink-0 flex-col items-center justify-center rounded border border-dashed border-border bg-muted/40 px-0.5 text-center text-[8px] font-medium uppercase leading-tight text-muted-foreground"
        title="No mobile crop yet"
      >
        Mob
      </div>
    );
  }
  return (
    <div className="relative h-20 w-10 shrink-0 overflow-hidden rounded border border-border" title={`${label} — mobile`}>
      <Image src={url} alt={`${label} mobile`} fill className="object-cover" sizes="40px" />
    </div>
  );
}

interface LookAdminClientProps {
  items: LookbookItem[];
  sectionVisible: boolean;
  initialStoreType: "streetwear" | "formal";
}

export function LookAdminClient({
  items: initialItems,
  sectionVisible: initialSectionVisible,
  initialStoreType,
}: LookAdminClientProps) {
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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
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
    },
    [initialStoreType]
  );

  const handleDualCropComplete = useCallback(
    async (desktopBlob: Blob, mobileBlob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
      if (!current.label.trim()) {
        toast.error("Category name is required");
        return;
      }
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);

      const desktopFile = new File([desktopBlob], current.file.name.replace(/\.[^.]+$/, "-desktop.jpg"), {
        type: "image/jpeg",
      });
      const mobileFile = new File([mobileBlob], current.file.name.replace(/\.[^.]+$/, "-mobile.jpg"), {
        type: "image/jpeg",
      });

      setIsAdding(true);
      const formData = new FormData();
      formData.append("image", desktopFile);
      formData.append("mobileImage", mobileFile);
      formData.append("label", current.label.trim());
      formData.append("href", (current.href || "/shop").trim());
      formData.append("storeType", current.storeType);
      const result = await addLookbookItemFromFile(formData);
      setIsAdding(false);

      if (result.error) {
        toast.error(result.error);
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
    accept: adminImageDropzoneAccept,
    maxSize: MAX_IMAGE_UPLOAD_BYTES,
    maxFiles: 1,
    disabled: !!cropFile || isAdding,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Get the Look</h1>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
            Managing: {initialStoreType}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox checked={sectionVisible} onCheckedChange={(checked) => handleSectionVisibilityChange(!!checked)} />
            Show section on home page
          </label>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button type="button" disabled={!!cropFile || isAdding} className="cursor-pointer">
              {isAdding ? "Adding…" : "Add Look"}
            </Button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <p className="mb-4">
            No items found for this store. Add your first <span className="capitalize">{initialStoreType}</span> item.
          </p>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" type="button" className="cursor-pointer">
              Add your first look
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
              <div className="flex gap-1.5 p-1.5 sm:gap-2 sm:p-2">
                <div className="relative aspect-[3/4] min-w-0 flex-1">
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                </div>
                <MobileCropPreview url={item.mobileImageUrl} label={item.label} />
              </div>
              <div className="flex flex-col gap-1 p-2 text-sm font-normal text-foreground sm:p-3">
                <span className="truncate">{item.label}</span>
                <span className="text-xs uppercase opacity-60">{item.storeType}</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}>
                  {deletingId === item.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cropFile && (
        <DualImageCropModal
          imageSrc={cropFile.objectUrl}
          onComplete={(desktop, mobile) => void handleDualCropComplete(desktop, mobile)}
          onCancel={handleCropCancel}
          desktopAspect={LOOK_DESKTOP_ASPECT}
          mobileAspect={LOOK_MOBILE_ASPECT}
          desktopLabel="3:4"
          mobileLabel="9:16"
          title="Crop look — desktop & mobile"
          confirmLabel="Add"
          disableConfirm={!cropFile.label.trim()}
          toolbar={
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[160px] flex-1 space-y-1">
                <label className="block text-xs uppercase tracking-wider text-muted-foreground">Category name</label>
                <Input
                  placeholder="e.g. Street, Everyday"
                  value={cropFile.label}
                  onChange={(e) => setCropFile((prev) => (prev ? { ...prev, label: e.target.value } : null))}
                  className="max-w-xs"
                />
              </div>
              <div className="min-w-[160px] flex-1 space-y-1">
                <label className="block text-xs uppercase tracking-wider text-muted-foreground">Link</label>
                <Input
                  placeholder="/shop"
                  value={cropFile.href}
                  onChange={(e) => setCropFile((prev) => (prev ? { ...prev, href: e.target.value } : null))}
                  className="max-w-xs"
                />
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
