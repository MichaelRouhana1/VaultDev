"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { ImageCropModal } from "@/components/ImageCropModal";
import { updateLandingImage, type LandingImageRow } from "@/actions/landing";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STORE_TYPES = ["streetwear", "formal"] as const;
type StoreType = (typeof STORE_TYPES)[number];

const FALLBACK_IMAGES: Record<StoreType, string> = {
  streetwear:
    "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  formal:
    "https://images.pexels.com/photos/3760854/pexels-photo-3760854.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
};

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

  const getImageUrl = useCallback(
    (storeType: StoreType) => {
      const row = initialImages.find((img) => img.storeType === storeType);
      return row?.imageUrl ?? FALLBACK_IMAGES[storeType];
    },
    [initialImages]
  );

  const triggerFileInput = useCallback((storeType: StoreType) => {
    if (cropFile || uploadingStoreType !== null) return;
    const input = inputRef.current;
    if (!input) return;
    (input as HTMLInputElement & { __storeType?: StoreType }).__storeType = storeType;
    input.click();
  }, [cropFile, uploadingStoreType]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    []
  );

  const handleCropComplete = useCallback(
    async (blob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);
      setUploadingStoreType(current.storeType);

      const file = new File([blob], `landing-${current.storeType}.jpg`, {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("image", file);

      const result = await updateLandingImage(current.storeType, formData);
      setUploadingStoreType(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${current.storeType.charAt(0).toUpperCase() + current.storeType.slice(1)} image updated`);
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
          Edit the Streetwear and Formal images shown on the root landing page. Uses ~1:1 half-screen crop to match split layout.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STORE_TYPES.map((storeType) => (
          <div
            key={storeType}
            className="border border-border rounded-lg overflow-hidden bg-muted"
          >
            <div className="aspect-[3/4] relative">
              <Image
                src={getImageUrl(storeType)}
                alt={`${storeType} landing`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerFileInput(storeType)}
                  disabled={isDisabled}
                >
                  {uploadingStoreType === storeType ? "Uploading…" : "Upload / Change Image"}
                </Button>
              </div>
            </div>
            <div className="p-4 text-sm font-medium capitalize">{storeType}</div>
          </div>
        ))}
      </div>

      {cropFile && (
        <ImageCropModal
          imageSrc={cropFile.objectUrl}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={99 / 100}
          title="Crop Image (Half-Screen Ratio)"
        />
      )}
    </div>
  );
}
