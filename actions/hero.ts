"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { asc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { heroImages } from "@/db/schema";
import { uploadHeroImage, deleteFromR2 } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

export async function getHeroImages(storeType?: string) {
  const conditions = [eq(heroImages.isActive, true)];
  if (storeType) {
    const validatedStore = z.enum(["streetwear", "formal"]).parse(storeType);
    conditions.push(eq(heroImages.storeType, validatedStore));
  }
  return db
    .select()
    .from(heroImages)
    .where(and(...conditions))
    .orderBy(asc(heroImages.order));
}

/** Fetches all hero images for admin (including inactive). */
export async function getAllHeroImages() {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "hero.list" });
    redirect("/");
  }
  return db
    .select()
    .from(heroImages)
    .orderBy(asc(heroImages.order));
}

export async function addHeroImage(imageUrl: string, altText?: string, storeType: "streetwear" | "formal" | "both" = "both") {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "hero.add" });
    redirect("/");
  }
  const validatedStore = z.enum(["streetwear", "formal", "both"]).parse(storeType);
  const validatedUrl = z.string().url().parse(imageUrl);
  const validatedAlt = altText ? z.string().parse(altText) : null;

  const [image] = await db
    .insert(heroImages)
    .values({
      imageUrl: validatedUrl,
      altText: validatedAlt,
      storeType: validatedStore,
    })
    .returning();
  if (image) auditLog({ userId: userId!, action: "hero.add", target: String(image.id) });
  return image;
}

export async function deleteHeroImage(id: number) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "hero.delete" });
    redirect("/");
  }
  const validId = z.number().int().positive().parse(id);
  const [image] = await db.select({ imageUrl: heroImages.imageUrl }).from(heroImages).where(eq(heroImages.id, validId)).limit(1);
  if (image?.imageUrl) await deleteFromR2(image.imageUrl);
  await db.delete(heroImages).where(eq(heroImages.id, validId));
  auditLog({ userId: userId!, action: "hero.delete", target: String(validId) });
}

/** Uploads a hero image file and adds it to the database. Admin only. */
export async function addHeroImageFromFile(formData: FormData): Promise<{ error?: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  const file = formData.get("image") as File | null;
  const storeTypeRaw = formData.get("storeType")?.toString() || "both";
  const storeType = z.enum(["streetwear", "formal", "both"]).parse(storeTypeRaw);
  if (!file?.size) return { error: "No image provided" };

  const filename = `hero-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadHeroImage(file, filename);
  if (result.error) return { error: result.error };
  if (!result.url) return { error: "Upload failed" };

  const [image] = await db
    .insert(heroImages)
    .values({
      imageUrl: result.url,
      altText: null,
      storeType,
    })
    .returning();
  if (image) auditLog({ userId: sessionClaims.sub ?? "", action: "hero.add", target: String(image.id) });
  return {};
}
