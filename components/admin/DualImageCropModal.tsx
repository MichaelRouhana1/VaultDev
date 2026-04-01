"use client";

import { useCallback, useState, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Extracts a JPEG blob for the given crop in the same coordinate space as
 * `croppedAreaPixels` from react-easy-crop (rotated natural bounding box).
 */
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.9
    );
  });
}

export interface DualImageCropModalProps {
  /** Object URL or remote URL for the uploaded image. */
  imageSrc: string;
  onComplete: (desktopBlob: Blob, mobileBlob: Blob) => void;
  onCancel: () => void;
  title?: string;
  /** Width/height ratio for the desktop crop. Default 16:9. */
  desktopAspect?: number;
  /** Width/height ratio for the mobile crop. Default 3:4. */
  mobileAspect?: number;
  /** Short label shown above the desktop cropper (e.g. "16:9"). */
  desktopLabel?: string;
  /** Short label shown above the mobile cropper (e.g. "3:4" or "9:16"). */
  mobileLabel?: string;
  /** Extra controls below the title row (e.g. lookbook label / link fields). */
  toolbar?: ReactNode;
  /** Label for the primary action button (default "Confirm"). */
  confirmLabel?: string;
  /** Additional disable reason (e.g. empty required fields in toolbar). */
  disableConfirm?: boolean;
}

export function DualImageCropModal({
  imageSrc,
  onComplete,
  onCancel,
  title = "Crop desktop & mobile",
  desktopAspect = 16 / 9,
  mobileAspect = 3 / 4,
  desktopLabel = "16:9",
  mobileLabel = "3:4",
  toolbar,
  confirmLabel = "Confirm",
  disableConfirm = false,
}: DualImageCropModalProps) {
  const [rotationDesktop, setRotationDesktop] = useState(0);
  const [rotationMobile, setRotationMobile] = useState(0);

  const [cropDesktop, setCropDesktop] = useState({ x: 0, y: 0 });
  const [zoomDesktop, setZoomDesktop] = useState(1);
  const [croppedAreaPixelsDesktop, setCroppedAreaPixelsDesktop] = useState<Area | null>(null);

  const [cropMobile, setCropMobile] = useState({ x: 0, y: 0 });
  const [zoomMobile, setZoomMobile] = useState(1);
  const [croppedAreaPixelsMobile, setCroppedAreaPixelsMobile] = useState<Area | null>(null);

  const [processing, setProcessing] = useState(false);

  const onCropAreaChangeDesktop = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixelsDesktop(pixels);
  }, []);

  const onCropAreaChangeMobile = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixelsMobile(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixelsDesktop || !croppedAreaPixelsMobile) return;
    setProcessing(true);
    try {
      const [desktopBlob, mobileBlob] = await Promise.all([
        getCroppedBlob(imageSrc, croppedAreaPixelsDesktop, rotationDesktop),
        getCroppedBlob(imageSrc, croppedAreaPixelsMobile, rotationMobile),
      ]);
      onComplete(desktopBlob, mobileBlob);
    } catch (err) {
      console.error("Dual crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const canSubmit = croppedAreaPixelsDesktop && croppedAreaPixelsMobile;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="bg-background flex h-[min(92vh,880px)] w-full max-w-6xl flex-col overflow-hidden border border-border">
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border p-3 sm:p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider sm:text-sm">{title}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="border border-border px-3 py-2 text-xs uppercase hover:bg-muted sm:px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={processing || !canSubmit || disableConfirm}
              className="bg-foreground px-3 py-2 text-xs uppercase text-background disabled:opacity-50 sm:px-4"
            >
              {processing ? "Processing…" : confirmLabel}
            </button>
          </div>
        </div>

        {toolbar ? (
          <div className="flex-shrink-0 border-b border-border px-3 py-3 sm:px-4">{toolbar}</div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:flex-row md:gap-4 md:overflow-hidden md:p-4">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 md:gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Desktop — {desktopLabel}
            </p>
            <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-2 py-2 sm:flex-row sm:items-center sm:px-3">
              <label
                htmlFor="dual-crop-rotation-desktop"
                className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:w-24 sm:shrink-0"
              >
                Rotation
              </label>
              <input
                id="dual-crop-rotation-desktop"
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotationDesktop}
                onChange={(e) => setRotationDesktop(Number(e.target.value))}
                className="h-2 w-full flex-1 cursor-pointer accent-foreground"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={rotationDesktop}
              />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{rotationDesktop}°</span>
            </div>
            <div className="relative min-h-[200px] flex-1 rounded-md border border-border bg-black/40 md:min-h-0">
              <Cropper
                image={imageSrc}
                crop={cropDesktop}
                zoom={zoomDesktop}
                rotation={rotationDesktop}
                aspect={desktopAspect}
                zoomSpeed={0.1}
                onCropChange={setCropDesktop}
                onZoomChange={setZoomDesktop}
                onRotationChange={setRotationDesktop}
                onCropAreaChange={onCropAreaChangeDesktop}
                objectFit="contain"
              />
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 md:gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Mobile — {mobileLabel}
            </p>
            <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-2 py-2 sm:flex-row sm:items-center sm:px-3">
              <label
                htmlFor="dual-crop-rotation-mobile"
                className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:w-24 sm:shrink-0"
              >
                Rotation
              </label>
              <input
                id="dual-crop-rotation-mobile"
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotationMobile}
                onChange={(e) => setRotationMobile(Number(e.target.value))}
                className="h-2 w-full flex-1 cursor-pointer accent-foreground"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={rotationMobile}
              />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{rotationMobile}°</span>
            </div>
            <div className="relative min-h-[200px] flex-1 rounded-md border border-border bg-black/40 md:min-h-0">
              <Cropper
                image={imageSrc}
                crop={cropMobile}
                zoom={zoomMobile}
                rotation={rotationMobile}
                aspect={mobileAspect}
                zoomSpeed={0.1}
                onCropChange={setCropMobile}
                onZoomChange={setZoomMobile}
                onRotationChange={setRotationMobile}
                onCropAreaChange={onCropAreaChangeMobile}
                objectFit="contain"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
