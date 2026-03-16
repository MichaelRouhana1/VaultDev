import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { validateUploadFile } from "@/lib/security";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const s3Client =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

async function uploadToR2(file: File, folder: string): Promise<{ url: string; error?: string }> {
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
        ContentType: file.type,
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
