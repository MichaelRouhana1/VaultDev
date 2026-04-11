"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { DualImageCropModal } from "@/components/admin/DualImageCropModal";
import { updateLandingImage, type LandingImageRow } from "@/actions/landing";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { storeTypeLabelEn } from "@/lib/store-type-display";

const STORE_TYPES = ["streetwear", "formal"] as const;
type StoreType = (typeof STORE_TYPES)[number];

/** Matches previous landing admin crop (~half-screen split). */
const LANDING_DESKTOP_ASPECT = 99 / 100;
const LANDING_MOBILE_ASPECT = 3 / 4;

const FALLBACK_IMAGES: Record<StoreType, string> = {
  streetwear:
    "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  formal:
    "https://images.pexels.com/photos/3760854/pexels-photo-3760854.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
};

function MobileCropPreview({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) {
    return (
      <div
        className="flex h-28 w-14 shrink-0 flex-col items-center justify-center rounded border border-dashed border-border bg-muted/40 px-1 text-center text-[9px] font-medium uppercase leading-tight text-muted-foreground"
        title="No mobile crop yet"
      >
        Mobile
      </div>
    );
  }
  return (
    <div className="relative h-28 w-14 shrink-0 overflow-hidden rounded border border-border" title={`${label} — mobile`}>
      <Image src={url} alt={`${label} mobile`} fill className="object-cover" sizes="56px" />
    </div>
  );
}

interface LandingAdminClientProps {
  images: LandingImageRow[];
}

export function LandingAdminClient({ images: initialImages }: LandingAdminClientProps) {
  const router = useRouter();
  const [cropFile, setCropFile] = useState<{ file: File; objectUrl: string; storeType: StoreType } | null>(null);
  const [uploadingStoreType, setUploadingStoreType] = useState<StoreType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cropFileRef = useRef<typeof cropFile>(null);
  cropFileRef.current = cropFile;

  const getRow = useCallback(
    (storeType: StoreType) => initialImages.find((img) => img.storeType === storeType),
    [initialImages]
  );

  const getDesktopUrl = useCallback(
    (storeType: StoreType) => {
      const row = getRow(storeType);
      return row?.imageUrl ?? FALLBACK_IMAGES[storeType];
    },
    [getRow]
  );

  const triggerFileInput = useCallback(
    (storeType: StoreType) => {
      if (cropFile || uploadingStoreType !== null) return;
      const input = inputRef.current;
      if (!input) return;
      (input as HTMLInputElement & { __storeType?: StoreType }).__storeType = storeType;
      input.click();
    },
    [cropFile, uploadingStoreType]
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    const storeType = (e.target as HTMLInputElement & { __storeType?: StoreType }).__storeType;
    if (!raw || !storeType) return;
    void (async () => {
      try {
        const file = await ensureBrowserDisplayableImage(raw);
        const url = URL.createObjectURL(file);
        setCropFile({ file, objectUrl: url, storeType });
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
      setUploadingStoreType(current.storeType);

      const desktopFile = new File([desktopBlob], `landing-${current.storeType}-desktop.jpg`, {
        type: "image/jpeg",
      });
      const mobileFile = new File([mobileBlob], `landing-${current.storeType}-mobile.jpg`, {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("image", desktopFile);
      formData.append("mobileImage", mobileFile);

      const result = await updateLandingImage(current.storeType, formData);
      setUploadingStoreType(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `${current.storeType.charAt(0).toUpperCase() + current.storeType.slice(1)} desktop & mobile images updated`
      );
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

  const isDisabled = !!cropFile || uploadingStoreType !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Landing Page Images</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crop desktop (~split layout) and mobile variants for the root landing page. Both are uploaded to storage when you confirm.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {STORE_TYPES.map((storeType) => {
          const row = getRow(storeType);
          return (
            <div key={storeType} className="overflow-hidden rounded-lg border border-border bg-muted">
              <div className="flex gap-2 p-2">
                <div className="relative aspect-[3/4] min-w-0 flex-1">
                  <Image
                    src={getDesktopUrl(storeType)}
                    alt={`${storeType} landing desktop`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => triggerFileInput(storeType)}
                      disabled={isDisabled}
                    >
                      {uploadingStoreType === storeType ? "Uploading…" : "Upload / Change"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col justify-center pt-6">
                  <span className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Mobile</span>
                  <MobileCropPreview url={row?.mobileImageUrl} label={`${storeType} landing`} />
                </div>
              </div>
              <div className="p-4 text-sm font-medium">{storeTypeLabelEn(storeType)}</div>
            </div>
          );
        })}
      </div>

      {cropFile && (
        <DualImageCropModal
          imageSrc={cropFile.objectUrl}
          onComplete={(desktop, mobile) => void handleDualCropComplete(desktop, mobile)}
          onCancel={handleCropCancel}
          desktopAspect={LANDING_DESKTOP_ASPECT}
          mobileAspect={LANDING_MOBILE_ASPECT}
          desktopLabel="Split / desktop"
          mobileLabel="3:4"
          title={`Crop landing — ${storeTypeLabelEn(cropFile.storeType)}`}
        />
      )}
    </div>
  );
}
