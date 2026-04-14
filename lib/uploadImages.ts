import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { canonicalImageMimeFromExt, validateUploadFile } from "@/lib/security";
import { getR2BucketName, getR2PublicBaseUrlNormalized, getR2S3Client } from "@/lib/r2-client";

async function uploadToR2(file: File, folder: string): Promise<{ url: string; error?: string }> {
  const s3Client = getR2S3Client();
  const bucketName = getR2BucketName();
  const publicUrl = getR2PublicBaseUrlNormalized();
  if (!s3Client || !bucketName || !publicUrl) {
    return { url: "", error: "R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL." };
  }

  const validation = validateUploadFile(file, "image");
  if (!validation.ok) return { url: "", error: validation.error };

  const ext = validation.ext;
  const uniqueFilename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: canonicalImageMimeFromExt(ext),
      })
    );

    const url = `${publicUrl.replace(/\/$/, "")}/${uniqueFilename}`;
    return { url };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return { url: "", error: "Failed to upload image." };
  }
}

export async function uploadProductImage(file: File, _filename: string): Promise<{ url?: string; error?: string }> {
  const result = await uploadToR2(file, "product-images");
  if (result.error) return { error: result.error };
  return { url: result.url };
}

export async function uploadHeroImage(file: File, _filename: string): Promise<{ url?: string; error?: string }> {
  const result = await uploadToR2(file, "hero-images");
  if (result.error) return { error: result.error };
  return { url: result.url };
}

export async function uploadLookImage(file: File, _filename: string): Promise<{ url?: string; error?: string }> {
  const result = await uploadToR2(file, "lookbook");
  if (result.error) return { error: result.error };
  return { url: result.url };
}

export async function uploadLandingImage(file: File, _filename: string): Promise<{ url?: string; error?: string }> {
  const result = await uploadToR2(file, "landing-images");
  if (result.error) return { error: result.error };
  return { url: result.url };
}

export async function uploadProductImages(imageFiles: File[], prefix: string): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];
  for (const file of imageFiles) {
    const result = await uploadProductImage(file, prefix);
    if (result.error) return { urls, error: result.error };
    if (result.url) urls.push(result.url);
  }
  return { urls };
}

export async function deleteFromR2(fileUrl: string): Promise<void> {
  const s3Client = getR2S3Client();
  const bucketName = getR2BucketName();
  const publicUrl = getR2PublicBaseUrlNormalized();
  if (!s3Client || !bucketName || !publicUrl) return;
  try {
    const base = publicUrl.replace(/\/$/, "");
    if (!fileUrl.startsWith(base)) return;
    const key = fileUrl.replace(`${base}/`, "");
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  } catch (error) {
    console.error(`Failed to delete from R2: ${fileUrl}`, error);
  }
}
