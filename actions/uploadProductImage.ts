"use server";

import { uploadProductImage as uploadToR2 } from "@/lib/uploadImages";
import { MAX_SERVER_ACTION_BODY_BYTES, requireAdmin } from "@/lib/security";

export async function uploadProductImage(
  file: File
): Promise<{ url: string } | { error: string }> {
  await requireAdmin();

  if (!file?.size) {
    return { error: "No file provided" };
  }

  if (file.size > MAX_SERVER_ACTION_BODY_BYTES) {
    return {
      error: `Image is too large. Maximum size is ${MAX_SERVER_ACTION_BODY_BYTES / (1024 * 1024)}MB.`,
    };
  }

  const result = await uploadToR2(file, `product-${Date.now()}`);
  if (result.error) return { error: result.error };
  if (!result.url) return { error: "Upload failed" };
  return { url: result.url };
}
