import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null | undefined;

export function getR2S3Client(): S3Client | null {
  if (cachedClient !== undefined) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export function getR2BucketName(): string | null {
  const name = process.env.R2_BUCKET_NAME?.trim();
  return name || null;
}

/** Normalized public base (no trailing slash). */
export function getR2PublicBaseUrlNormalized(): string | null {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}
