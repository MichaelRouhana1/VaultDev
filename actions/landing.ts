"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { landingImages } from "@/db/schema";
import { uploadLandingImage, deleteFromR2 } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security";

export type LandingImageRow = typeof landingImages.$inferSelect;

/** Fetch all landing images (streetwear, formal). Public - no auth. */
export async function getLandingImages(): Promise<LandingImageRow[]> {
  return db.select().from(landingImages);
}

/** Update a landing image for a store type. Admin only. Deletes old R2 file before inserting new one. */
export async function updateLandingImage(
  storeType: "streetwear" | "formal",
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const { userId } = await requireAdmin();

  const file = formData.get("image") as File | null;
  if (!file?.size) {
    return { error: "No image provided" };
  }

  const [existing] = await db
    .select({ imageUrl: landingImages.imageUrl })
    .from(landingImages)
    .where(eq(landingImages.storeType, storeType))
    .limit(1);

  if (existing?.imageUrl) {
    await deleteFromR2(existing.imageUrl);
  }

  const filename = `landing-${storeType}-${Date.now()}`;
  const result = await uploadLandingImage(file, filename);
  if (result.error) return { error: result.error };
  if (!result.url) return { error: "Upload failed" };

  await db
    .insert(landingImages)
    .values({
      storeType,
      imageUrl: result.url,
    })
    .onConflictDoUpdate({
      target: landingImages.storeType,
      set: {
        imageUrl: result.url,
        updatedAt: new Date(),
      },
    });

  auditLog({ userId: userId!, action: "landing.update", target: storeType });
  revalidatePath("/");
  revalidatePath("/admin/landing");
  return { success: true };
}
