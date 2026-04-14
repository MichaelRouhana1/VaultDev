"use server";

import { z } from "zod";
import { requireAdminAction } from "@/lib/security";
import {
  createPresignedImagePut,
  R2_IMAGE_UPLOAD_FOLDERS,
} from "@/lib/r2-presigned-put";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-limits";

const paramsSchema = z.object({
  folder: z.enum(R2_IMAGE_UPLOAD_FOLDERS),
  fileName: z.string().min(1).max(500),
  contentType: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_IMAGE_UPLOAD_BYTES),
});

export async function presignAdminImageUpload(
  raw: z.infer<typeof paramsSchema>
): Promise<
  { uploadUrl: string; publicUrl: string; contentType: string } | { error: string }
> {
  const gate = await requireAdminAction({ auditTarget: "r2.presign" });
  if (!gate.authorized) return { error: gate.response.error };

  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid presign request" };
  }

  const result = await createPresignedImagePut(parsed.data);
  if ("error" in result) return { error: result.error };
  return {
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
    contentType: result.contentType,
  };
}
