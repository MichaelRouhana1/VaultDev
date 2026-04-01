"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { landingImages } from "@/db/schema";
import { uploadLandingImage, deleteFromR2 } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security";
import { z } from "zod";

export type LandingImageRow = typeof landingImages.$inferSelect;

/** Fetch all landing images (streetwear, formal). Public - no auth. */
export async function getLandingImages(): Promise<LandingImageRow[]> {
  return db.select().from(landingImages);
}

/**
 * Update landing desktop and/or mobile image for a store type. Admin only.
 * Provide `image` (desktop), `mobileImage`, and/or `mobileImageUrl` in FormData.
 * At least one of these must be present. Deletes replaced R2 objects when updating.
 */
export async function updateLandingImage(
  storeType: "streetwear" | "formal",
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await requireAdmin();

  const file = formData.get("image") as File | null;
  const mobileFile = formData.get("mobileImage") as File | null;
  const mobileUrlRaw = formData.get("mobileImageUrl")?.toString()?.trim();

  if (!file?.size && !mobileFile?.size && !mobileUrlRaw) {
    return { error: "Provide desktop image, mobile image, or mobile image URL" };
  }

  const [existing] = await db
    .select({
      imageUrl: landingImages.imageUrl,
      mobileImageUrl: landingImages.mobileImageUrl,
    })
    .from(landingImages)
    .where(eq(landingImages.storeType, storeType))
    .limit(1);

  let nextImageUrl = existing?.imageUrl;
  let nextMobileUrl: string | null | undefined = existing?.mobileImageUrl ?? null;

  if (file?.size) {
    if (existing?.imageUrl) await deleteFromR2(existing.imageUrl);
    const filename = `landing-${storeType}-${Date.now()}`;
    const result = await uploadLandingImage(file, filename);
    if (result.error) return { error: result.error };
    if (!result.url) return { error: "Upload failed" };
    nextImageUrl = result.url;
  }

  if (mobileFile?.size) {
    if (existing?.mobileImageUrl) await deleteFromR2(existing.mobileImageUrl);
    const mobileFilename = `landing-mobile-${storeType}-${Date.now()}`;
    const mobileResult = await uploadLandingImage(mobileFile, mobileFilename);
    if (mobileResult.error) return { error: mobileResult.error };
    if (!mobileResult.url) return { error: "Mobile upload failed" };
    nextMobileUrl = mobileResult.url;
  } else if (mobileUrlRaw) {
    if (existing?.mobileImageUrl && existing.mobileImageUrl !== mobileUrlRaw) {
      await deleteFromR2(existing.mobileImageUrl);
    }
    nextMobileUrl = z.string().url().parse(mobileUrlRaw);
  }

  if (!nextImageUrl) {
    return { error: "Desktop landing image is required before adding mobile-only; upload the main image first" };
  }

  await db
    .insert(landingImages)
    .values({
      storeType,
      imageUrl: nextImageUrl,
      mobileImageUrl: nextMobileUrl ?? null,
    })
    .onConflictDoUpdate({
      target: landingImages.storeType,
      set: {
        imageUrl: nextImageUrl,
        mobileImageUrl: nextMobileUrl ?? null,
        updatedAt: new Date(),
      },
    });

  auditLog({ userId: userId!, action: "landing.update", target: storeType });
  revalidatePath("/");
  revalidatePath("/admin/landing");
  return { success: true };
}
