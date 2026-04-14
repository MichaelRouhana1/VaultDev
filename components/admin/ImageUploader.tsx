"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminHexColorField } from "@/components/admin/AdminHexColorField";
import { cn } from "@/lib/utils";
import { ensureBrowserDisplayableImage } from "@/lib/ensureBrowserDisplayableImage";
import { adminImageDropzoneAccept } from "@/lib/image-upload-accept";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-limits";
import { toast } from "sonner";

export interface ColorEntry {
    id: string | number;
    name: string;
    hexCode: string;
    imageFiles: File[];
    /** Persisted URLs (edit flow); new uploads go through `imageFiles`. */
    imageUrls?: string[];
    stockBySize: Record<string, number>;
}

interface ImageUploaderProps {
    color: ColorEntry;
    onUpdate: (updates: Partial<Omit<ColorEntry, "id">>) => void;
    onRemove: () => void;
    onAddFiles: (files: File[]) => void;
    onRemoveFile: (index: number) => void;
    onRemoveExistingImage?: (index: number) => void;
    canRemove: boolean;
}

export function ImageUploader({
    color,
    onUpdate,
    onRemove,
    onAddFiles,
    onRemoveFile,
    onRemoveExistingImage,
    canRemove,
}: ImageUploaderProps) {
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
        accept: adminImageDropzoneAccept,
        maxSize: MAX_IMAGE_UPLOAD_BYTES,
    });

    return (
        <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor={`color-name-${String(color.id)}`}>Color name</Label>
                        <Input
                            id={`color-name-${String(color.id)}`}
                            placeholder="e.g. Midnight Black"
                            value={color.name}
                            onChange={(e) => onUpdate({ name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={`color-hex-${color.id}`}>Hex code</Label>
                        <AdminHexColorField
                            id={`color-hex-${String(color.id)}`}
                            value={color.hexCode}
                            onChange={(hex) => onUpdate({ hexCode: hex })}
                            colorLabel={color.name || "variant"}
                            showEyedropper={false}
                        />
                    </div>
                </div>
                {canRemove && (
                    <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
                        Remove
                    </Button>
                )}
            </div>
            <div className="space-y-1.5">
                <Label id={`images-label-${String(color.id)}`}>Images (this color only)</Label>
                {(color.imageUrls?.length ?? 0) > 0 && onRemoveExistingImage && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {color.imageUrls!.map((url, i) => (
                            <div
                                key={url + i}
                                className="relative w-20 h-20 rounded overflow-hidden bg-muted shrink-0 group"
                            >
                                <Image src={url} alt="" fill className="object-cover" sizes="80px" />
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
                    <input {...getInputProps()} aria-labelledby={`images-label-${String(color.id)}`} />
                    <p className="text-center text-sm text-muted-foreground">
                        {isDragActive ? "Drop images here…" : "Drag & drop or click to add images"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, GIF up to 15MB</p>
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
                    onEyedropperColor={(hex) => onUpdate({ hexCode: hex })}
                    eyedropperLabel={color.name || "variant"}
                />
            )}
        </div>
    );
}
