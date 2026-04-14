"use client";

import { presignAdminImageUpload } from "@/actions/r2-presign";
import type { R2ImageUploadFolder } from "@/lib/r2-presigned-put";

/**
 * Browser → R2 direct PUT using a presigned URL (bypasses Vercel serverless body limits).
 * Requires R2 bucket CORS to allow PUT from your storefront origin.
 */
export async function uploadImageFileViaPresign(
  file: File,
  folder: R2ImageUploadFolder
): Promise<{ publicUrl: string } | { error: string }> {
  const presigned = await presignAdminImageUpload({
    folder,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });
  if ("error" in presigned) return { error: presigned.error };

  let res: Response;
  try {
    res = await fetch(presigned.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": presigned.contentType },
    });
  } catch (e) {
    console.error("R2 PUT failed:", e);
    return {
      error:
        "Network error talking to storage. If this persists, confirm R2 bucket CORS allows PUT from this site.",
    };
  }

  if (!res.ok) {
    return {
      error: `Storage upload failed (${res.status}). Confirm R2 CORS allows PUT and your origin.`,
    };
  }

  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (base && presigned.publicUrl !== base && !presigned.publicUrl.startsWith(`${base}/`)) {
    return { error: "Unexpected storage URL from server." };
  }

  return { publicUrl: presigned.publicUrl };
}
