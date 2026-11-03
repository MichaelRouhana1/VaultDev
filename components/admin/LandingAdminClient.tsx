"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { DualImageCropModal } from "@/components/admin/DualImageCropModal";
import {
  updateGenderLandingImage,
  updateLandingImage,
  type GenderLandingImageRow,
  type LandingImageRow,
} from "@/actions/landing";
import { uploadImageFileViaPresign } from "@/lib/upload-image-presigned-client";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Slot =
  | { kind: "gender"; key: "men" | "women" }
  | { kind: "style"; key: "streetwear" | "formal" };

const GENDER_SLOTS: Slot[] = [
  { kind: "gender", key: "men" },
  { kind: "gender", key: "women" },
];
const STYLE_SLOTS: Slot[] = [
  { kind: "style", key: "streetwear" },
  { kind: "style", key: "formal" },
];

const SLOT_LABELS: Record<Slot["key"], string> = {
  men: "Men",
  women: "Women",
  streetwear: "Streetwear",
  formal: "Classic",
};

/** Matches previous landing admin crop (~half-screen split). */
const LANDING_DESKTOP_ASPECT = 99 / 100;
const LANDING_MOBILE_ASPECT = 3 / 4;

const PEXELS = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop`;

/** Keep in sync with `lib/store-gate-images.ts`. */
const FALLBACK_IMAGES: Record<Slot["key"], string> = {
  men: PEXELS(2897531),
  women: PEXELS(2235071),
  streetwear:
    "https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  formal: PEXELS(3760854),
};

function slotId(slot: Slot): string {
  return `${slot.kind}:${slot.key}`;
}

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
  genderImages: GenderLandingImageRow[];
}

export function LandingAdminClient({ images, genderImages }: LandingAdminClientProps) {
  const router = useRouter();
  const [cropFile, setCropFile] = useState<{ file: File; objectUrl: string; slot: Slot } | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<Slot | null>(null);

  const cropFileRef = useRef<typeof cropFile>(null);
  cropFileRef.current = cropFile;

  const getRow = useCallback(
    (slot: Slot): { imageUrl: string; mobileImageUrl: string | null } | undefined =>
      slot.kind === "gender"
        ? genderImages.find((img) => img.gender === slot.key)
        : images.find((img) => img.storeType === slot.key),
    [images, genderImages]
  );

  const triggerFileInput = useCallback(
    (slot: Slot) => {
      if (cropFile || uploadingSlot !== null) return;
      const input = inputRef.current;
      if (!input) return;
      pendingSlotRef.current = slot;
      input.click();
    },
    [cropFile, uploadingSlot]
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    const slot = pendingSlotRef.current;
    if (!raw || !slot) return;
    void (async () => {
      try {
        const file = await ensureBrowserDisplayableImage(raw);
        const url = URL.createObjectURL(file);
        setCropFile({ file, objectUrl: url, slot });
      } catch {
        toast.error("Could not load image. For HEIC/HEIF, try again or use JPEG or PNG.");
      }
    })();
  }, []);

  const handleDualCropComplete = useCallback(
    async (desktopBlob: Blob, mobileBlob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
      const { slot } = current;
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);
      setUploadingSlot(slotId(slot));

      const desktopFile = new File([desktopBlob], `landing-${slot.key}-desktop.jpg`, { type: "image/jpeg" });
      const mobileFile = new File([mobileBlob], `landing-${slot.key}-mobile.jpg`, { type: "image/jpeg" });

      const desktopUp = await uploadImageFileViaPresign(desktopFile, "landing-images");
      if ("error" in desktopUp) {
        toast.error(desktopUp.error);
        setUploadingSlot(null);
        return;
      }
      const mobileUp = await uploadImageFileViaPresign(mobileFile, "landing-images");
      if ("error" in mobileUp) {
        toast.error(mobileUp.error);
        setUploadingSlot(null);
        return;
      }

      const payload = { imageUrl: desktopUp.publicUrl, mobileImageUrl: mobileUp.publicUrl };
      const result =
        slot.kind === "gender"
          ? await updateGenderLandingImage(slot.key, payload)
          : await updateLandingImage(slot.key, payload);
      setUploadingSlot(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${SLOT_LABELS[slot.key]} desktop & mobile images updated`);
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

  const isDisabled = !!cropFile || uploadingSlot !== null;

  const renderSlot = (slot: Slot) => {
    const row = getRow(slot);
    const label = SLOT_LABELS[slot.key];
    return (
      <div key={slotId(slot)} className="overflow-hidden rounded-lg border border-border bg-muted">
        <div className="flex gap-2 p-2">
          <div className="relative aspect-[3/4] min-w-0 flex-1">
            <Image
              src={row?.imageUrl ?? FALLBACK_IMAGES[slot.key]}
              alt={`${label} landing desktop`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => triggerFileInput(slot)}
                disabled={isDisabled}
              >
                {uploadingSlot === slotId(slot) ? "Uploading…" : "Upload / Change"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-center pt-6">
            <span className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Mobile</span>
            <MobileCropPreview url={row?.mobileImageUrl} label={`${label} landing`} />
          </div>
        </div>
        <div className="p-4 text-sm font-medium">{label}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Landing Page Images</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crop desktop (~split layout) and mobile variants for the entry screens. Both are uploaded to storage when you confirm.
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

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Entry screen (Men / Women)</h2>
          <p className="text-sm text-muted-foreground">First screen visitors see at the site root.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{GENDER_SLOTS.map(renderSlot)}</div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Men style screen (Streetwear / Classic)</h2>
          <p className="text-sm text-muted-foreground">Shown after a visitor picks Men.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{STYLE_SLOTS.map(renderSlot)}</div>
      </section>

      {cropFile && (
        <DualImageCropModal
          imageSrc={cropFile.objectUrl}
          onComplete={(desktop, mobile) => void handleDualCropComplete(desktop, mobile)}
          onCancel={handleCropCancel}
          desktopAspect={LANDING_DESKTOP_ASPECT}
          desktopLabel="Split / desktop"
          mobileAspect={LANDING_MOBILE_ASPECT}
          mobileLabel="3:4"
          title={`Crop landing — ${SLOT_LABELS[cropFile.slot.key]}`}
        />
      )}
    </div>
  );
}
