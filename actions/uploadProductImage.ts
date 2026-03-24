"use server";

import { uploadProductImage as uploadToR2 } from "@/lib/uploadImages";
import { requireAdmin } from "@/lib/security";

export async function uploadProductImage(
  file: File
): Promise<{ url: string } | { error: string }> {
  await requireAdmin();

  if (!file?.size) {
    return { error: "No file provided" };
  }

  const result = await uploadToR2(file, `product-${Date.now()}`);
  if (result.error) return { error: result.error };
  if (!result.url) return { error: "Upload failed" };
  return { url: result.url };
}
