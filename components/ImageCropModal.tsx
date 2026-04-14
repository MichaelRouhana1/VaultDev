"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { AdminEyedropperButton } from "@/components/admin/AdminHexColorField";
import { loadImageForCanvas } from "@/lib/canvas-load-image";

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await loadImageForCanvas(imageSrc);
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

interface ImageCropModalProps {
  imageSrc: string;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
  /** Aspect ratio for crop (e.g. 16/9 for 16:9). Default 2/3 for product cards. */
  aspect?: number;
  /** Title shown in the modal header. */
  title?: string;
  /** When set, shows a pipette in the modal to sample a color (e.g. from this image) via the EyeDropper API. */
  onEyedropperColor?: (hex: string) => void;
  /** Accessible label for the eyedropper when `onEyedropperColor` is set. */
  eyedropperLabel?: string;
}

export function ImageCropModal({
  imageSrc,
  onComplete,
  onCancel,
  aspect = 2 / 3,
  title = "Crop image (2:3 product card ratio)",
  onEyedropperColor,
  eyedropperLabel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onComplete(blob);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onEyedropperColor ? (
              <AdminEyedropperButton
                onPick={onEyedropperColor}
                colorLabel={eyedropperLabel ?? "variant"}
              />
            ) : null}
            <button
              type="button"
              onClick={onCancel}
              className="border border-border px-4 py-2 text-xs uppercase hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="bg-foreground px-4 py-2 text-xs uppercase text-background disabled:opacity-50"
            >
              {processing ? "Processing…" : "Confirm"}
            </button>
          </div>
        </div>
        <div className="relative flex-1 min-h-[500px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
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
