"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { genderLandingImages, landingImages } from "@/db/schema";
import { deleteFromR2 } from "@/lib/uploadImages";
import { isTrustedR2PublicUrl } from "@/lib/r2-public-url";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security";
import { z } from "zod";
import { logger } from "@/lib/logger";

export type LandingImageRow = typeof landingImages.$inferSelect;
export type GenderLandingImageRow = typeof genderLandingImages.$inferSelect;
export type LandingGender = GenderLandingImageRow["gender"];

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
  revalidatePath("/men");
  revalidatePath("/admin/landing");
  return { success: true };
}

/**
 * Entry screen (Men / Women) images. Public - no auth.
 * Returns [] when `gender_landing_images` is missing (before `npm run db:migrate:women`) so the gate falls back to defaults.
 */
export async function getGenderLandingImages(): Promise<GenderLandingImageRow[]> {
  try {
    return await db.select().from(genderLandingImages);
  } catch (err) {
    logger.warn("gender_landing_images unavailable; using fallback images", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Update entry screen desktop + mobile images for Men or Women after direct-to-R2 uploads. Admin only. */
export async function updateGenderLandingImage(
  gender: LandingGender,
  payload: { imageUrl: string; mobileImageUrl: string }
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await requireAdmin();

  const parsed = z
    .object({
      gender: z.enum(["men", "women"]),
      imageUrl: z.string().trim().url(),
      mobileImageUrl: z.string().trim().url(),
    })
    .safeParse({ gender, imageUrl: payload.imageUrl, mobileImageUrl: payload.mobileImageUrl });
  if (!parsed.success) return { error: "Invalid image payload" };
  const { gender: validGender, imageUrl, mobileImageUrl } = parsed.data;
  if (!isTrustedR2PublicUrl(imageUrl) || !isTrustedR2PublicUrl(mobileImageUrl)) {
    return { error: "Image URLs must use configured R2 public storage" };
  }

  const [existing] = await db
    .select({
      imageUrl: genderLandingImages.imageUrl,
      mobileImageUrl: genderLandingImages.mobileImageUrl,
    })
    .from(genderLandingImages)
    .where(eq(genderLandingImages.gender, validGender))
    .limit(1);

  if (existing?.imageUrl && existing.imageUrl !== imageUrl) await deleteFromR2(existing.imageUrl);
  if (existing?.mobileImageUrl && existing.mobileImageUrl !== mobileImageUrl) {
    await deleteFromR2(existing.mobileImageUrl);
  }

  await db
    .insert(genderLandingImages)
    .values({ gender: validGender, imageUrl, mobileImageUrl })
    .onConflictDoUpdate({
      target: genderLandingImages.gender,
      set: { imageUrl, mobileImageUrl, updatedAt: new Date() },
    });

  auditLog({ userId: userId!, action: "landing.gender.update", target: validGender });
  revalidatePath("/");
  revalidatePath("/men");
  revalidatePath("/admin/landing");
  return { success: true };
}
