"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useDropzone } from "react-dropzone";
import { DualImageCropModal } from "@/components/admin/DualImageCropModal";
import { addHeroImageFromFile, deleteHeroImage } from "@/actions/hero";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { adminImageDropzoneAccept } from "@/lib/image-upload-accept";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-limits";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storeTypeLabelEn } from "@/lib/store-type-display";
import type { HeroImage } from "@/db/schema";

/** Base ratio from ~1567×544 art; scaled for storefront `md:h-[86vh]` (75vh reference). */
const HERO_DESKTOP_ASPECT = (72 / 25) * (75 / 86);
/** Measured mobile frame ~349×323 at 50vh min-height; scaled for storefront `min-h-[82vh]`. */
const HERO_MOBILE_ASPECT = (349.09 / 323.57) * (50 / 82);

function MobileCropPreview({ url, alt }: { url: string | null | undefined; alt: string }) {
  if (!url) {
    return (
      <div
        className="flex w-12 shrink-0 flex-col items-center justify-center rounded border border-dashed border-border bg-muted/40 px-0.5 text-center text-[8px] font-medium uppercase leading-tight text-muted-foreground"
        style={{ aspectRatio: HERO_MOBILE_ASPECT }}
        title="No mobile crop yet"
      >
        Mobile
      </div>
    );
  }
  return (
    <div
      className="relative w-12 shrink-0 overflow-hidden rounded border border-border"
      style={{ aspectRatio: HERO_MOBILE_ASPECT }}
      title={`${alt} — mobile`}
    >
      <Image src={url} alt={`${alt} mobile`} fill className="object-cover" sizes="48px" />
    </div>
  );
}

interface HeroAdminClientProps {
  images: HeroImage[];
  initialStoreType: "streetwear" | "formal";
}

export function HeroAdminClient({ images: initialImages, initialStoreType }: HeroAdminClientProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [cropFile, setCropFile] = useState<{ file: File; objectUrl: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const cropFileRef = useRef<{ file: File; objectUrl: string } | null>(null);
  cropFileRef.current = cropFile;

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length < 1) return;
    void (async () => {
      try {
        const file = await ensureBrowserDisplayableImage(acceptedFiles[0]);
        const url = URL.createObjectURL(file);
        setCropFile({ file, objectUrl: url });
      } catch {
        toast.error("Could not load image. For HEIC/HEIF, try again or use JPEG or PNG.");
      }
    })();
  }, []);

  const handleDualCropComplete = useCallback(
    async (desktopBlob: Blob, mobileBlob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
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
      formData.append("storeType", initialStoreType);
      const result = await addHeroImageFromFile(formData);
      setIsAdding(false);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    },
    [router, initialStoreType]
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
      await deleteHeroImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
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
          <h1 className="text-2xl font-bold">Hero Slideshow</h1>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
            Managing: {initialStoreType}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button type="button" disabled={!!cropFile || isAdding} className="cursor-pointer">
              {isAdding ? "Adding…" : "Add Slide"}
            </Button>
          </div>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <p className="mb-4">
            No items found for this store. Add your first <span className="capitalize">{initialStoreType}</span> item.
          </p>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" type="button" className="cursor-pointer">
              Add your first slide
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
              <div className="flex gap-2 p-2">
                <div className="relative min-w-0 flex-1" style={{ aspectRatio: HERO_DESKTOP_ASPECT }}>
                  <Image
                    src={img.imageUrl}
                    alt={img.altText ?? "Hero slide"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <MobileCropPreview url={img.mobileImageUrl} alt={img.altText ?? "Hero slide"} />
              </div>
              <div className="flex justify-between p-3 text-sm font-normal text-foreground">
                <span>Slide #{img.id}</span>
                <span className="rounded bg-muted-foreground/10 px-2 opacity-60">
                  {storeTypeLabelEn(img.storeType as "streetwear" | "formal")}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(img.id)} disabled={deletingId === img.id}>
                  {deletingId === img.id ? "Deleting…" : "Delete"}
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
          desktopAspect={HERO_DESKTOP_ASPECT}
          mobileAspect={HERO_MOBILE_ASPECT}
          desktopLabel="Hero wide"
          mobileLabel="Mobile hero (82vh min)"
          title="Crop hero — desktop & mobile"
        />
      )}
    </div>
  );
}
