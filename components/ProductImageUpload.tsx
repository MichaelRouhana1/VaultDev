"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImageCropModal } from "./ImageCropModal";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { toast } from "sonner";

interface ProductImageUploadProps {
  imageUrl: string;
  onChange: (url: string) => void;
  onError?: (err: Error) => void;
  slotLabel?: string;
  uploadImage: (file: File) => Promise<{ url: string }>;
}

export function ProductImageUpload({
  imageUrl,
  onChange,
  onError,
  slotLabel,
  uploadImage,
}: ProductImageUploadProps) {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingObjectUrl, setPendingObjectUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw || !raw.type.startsWith("image/")) return;
    void (async () => {
      try {
        const file = await ensureBrowserDisplayableImage(raw);
        const url = URL.createObjectURL(file);
        setPendingObjectUrl(url);
        setCropModalOpen(true);
      } catch {
        toast.error("Could not load image. For HEIC/HEIF, try again or use JPEG or PNG.");
      }
    })();
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!pendingObjectUrl) return;
    URL.revokeObjectURL(pendingObjectUrl);
    setPendingObjectUrl(null);
    setCropModalOpen(false);

    setUploading(true);
    try {
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error("Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    if (pendingObjectUrl) {
      URL.revokeObjectURL(pendingObjectUrl);
    }
    setPendingObjectUrl(null);
    setCropModalOpen(false);
  };

  return (
    <div className="space-y-2">
      {slotLabel && (
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {slotLabel}
        </p>
      )}
      <div className="flex gap-4 items-start">
        <div className="w-24 aspect-[2/3] overflow-hidden bg-muted border border-border flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Preview"
              width={96}
              height={144}
              className="w-full h-full object-cover"

            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              —
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">
            Preview: how it will look on product cards (2:3 ratio)
          </p>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="text-sm file:rounded-none file:border file:border-border file:px-4 file:py-2 file:bg-background file:text-foreground"
            />
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or paste image URL"
              className="flex-1 min-w-[200px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          {uploading && (
            <span className="text-xs text-muted-foreground">Uploading…</span>
          )}
        </div>
      </div>

      {cropModalOpen && pendingObjectUrl && (
        <ImageCropModal
          imageSrc={pendingObjectUrl}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
