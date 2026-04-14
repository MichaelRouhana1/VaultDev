import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  canonicalImageMimeFromExt,
  sanitizeFilename,
  validateUploadFile,
} from "@/lib/security";
import { getR2BucketName, getR2PublicBaseUrlNormalized, getR2S3Client } from "@/lib/r2-client";

export const R2_IMAGE_UPLOAD_FOLDERS = [
  "product-images",
  "hero-images",
  "lookbook",
  "landing-images",
] as const;

export type R2ImageUploadFolder = (typeof R2_IMAGE_UPLOAD_FOLDERS)[number];

export type PresignedImagePutResult =
  | { uploadUrl: string; publicUrl: string; contentType: string; key: string }
  | { error: string };

const PRESIGN_EXPIRES_SECONDS = 15 * 60;

/**
 * Issues a short-lived presigned PUT for a single image object.
 * Caller must send `Content-Type: contentType` on the PUT (matches the signature).
 */
export async function createPresignedImagePut(params: {
  folder: R2ImageUploadFolder;
  fileName: string;
  contentType: string;
  size: number;
}): Promise<PresignedImagePutResult> {
  const s3 = getR2S3Client();
  const bucket = getR2BucketName();
  const publicBase = getR2PublicBaseUrlNormalized();
  if (!s3 || !bucket || !publicBase) {
    return { error: "R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL." };
  }

  const safeName = sanitizeFilename(params.fileName);
  const nameForValidation = safeName && safeName.includes(".") ? safeName : `${safeName || "upload"}.jpg`;

  const validation = validateUploadFile(
    { name: nameForValidation, type: params.contentType, size: params.size },
    "image"
  );
  if (!validation.ok) return { error: validation.error };

  const ext = validation.ext;
  const key = `${params.folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const contentType = canonicalImageMimeFromExt(ext);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  try {
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
    const publicUrl = `${publicBase}/${key}`;
    return { uploadUrl, publicUrl, contentType, key };
  } catch (e) {
    console.error("R2 presign error:", e);
    return { error: "Could not create upload URL." };
  }
}
