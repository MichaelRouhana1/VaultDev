"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { landingImages } from "@/db/schema";
import { deleteFromR2 } from "@/lib/uploadImages";
import { isTrustedR2PublicUrl } from "@/lib/r2-public-url";
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
 * Update landing desktop + mobile images for a store type after direct-to-R2 uploads. Admin only.
 * Deletes replaced R2 objects when updating.
 */
export async function updateLandingImage(
  storeType: "streetwear" | "formal",
  payload: { imageUrl: string; mobileImageUrl: string }
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await requireAdmin();

  const imageUrl = z.string().url().parse(payload.imageUrl.trim());
  const mobileImageUrl = z.string().url().parse(payload.mobileImageUrl.trim());
  if (!isTrustedR2PublicUrl(imageUrl) || !isTrustedR2PublicUrl(mobileImageUrl)) {
    return { error: "Image URLs must use configured R2 public storage" };
  }

  const [existing] = await db
    .select({
      imageUrl: landingImages.imageUrl,
      mobileImageUrl: landingImages.mobileImageUrl,
    })
    .from(landingImages)
    .where(eq(landingImages.storeType, storeType))
    .limit(1);

  if (existing?.imageUrl && existing.imageUrl !== imageUrl) await deleteFromR2(existing.imageUrl);
  if (existing?.mobileImageUrl && existing.mobileImageUrl !== mobileImageUrl) {
    await deleteFromR2(existing.mobileImageUrl);
  }

  const nextImageUrl = imageUrl;
  const nextMobileUrl = mobileImageUrl;

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
