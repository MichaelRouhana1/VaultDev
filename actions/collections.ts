"use server";

import { cache } from "react";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { uploadProductImage } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { headers } from "next/headers";
import { checkSensitiveOperationLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { collectionFormSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/security";

export type CollectionRow = typeof collections.$inferSelect;

export const getCollectionsForProductForm = cache(
  async (storeType: "streetwear" | "formal"): Promise<CollectionRow[]> => {
    return db
      .select()
      .from(collections)
      .where(inArray(collections.storeType, [storeType, "both"]))
      .orderBy(asc(collections.name));
  },
);

export async function getAllCollections(): Promise<CollectionRow[]> {
  await requireAdmin();
  return db.select().from(collections).orderBy(asc(collections.name));
}

export async function createCollection(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const nameRaw = (formData.get("name") as string)?.trim();
  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const descRaw = (formData.get("description") as string)?.trim() || null;
  const storeTypeRaw = (formData.get("storeType") as string) || "streetwear";

  const parsed = collectionFormSchema.safeParse({
    name: nameRaw,
    slug: slugRaw,
    description: descRaw,
    storeType: storeTypeRaw,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Create collection validation failed", undefined, { errorDetails });
    return { success: false, error: errorDetails };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-collection-create:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const { userId } = await requireAdmin();
  const { name, slug, description, storeType } = parsed.data;
  const imageFile = formData.get("image") as File | null;

  const [existing] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  if (existing) return { error: "A collection with this slug already exists" };

  let imageUrl: string | null = null;
  if (imageFile?.size) {
    const result = await uploadProductImage(imageFile, `collection-${slug}-${Date.now()}`);
    if (result.error) return { error: result.error };
    imageUrl = result.url ?? null;
  }

  await db.insert(collections).values({
    name,
    slug,
    description: description || null,
    storeType,
    imageUrl,
  });
  auditLog({ userId: userId!, action: "collection.create", target: slug, details: { name } });
  return {};
}

export async function updateCollection(
  id: number,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const parsedId = z.number().int().positive().safeParse(id);
  if (!parsedId.success) return { success: false, error: "Validation failed" };
  const validId = parsedId.data;

  const nameRaw = (formData.get("name") as string)?.trim();
  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const descRaw = (formData.get("description") as string)?.trim() || null;
  const storeTypeRaw = (formData.get("storeType") as string) || "streetwear";

  const parsed = collectionFormSchema.safeParse({
    name: nameRaw,
    slug: slugRaw,
    description: descRaw,
    storeType: storeTypeRaw,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Update collection validation failed", undefined, { errorDetails, id });
    return { success: false, error: errorDetails };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-collection-update:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const { userId } = await requireAdmin();
  const { name, slug, description, storeType } = parsed.data;
  const imageFile = formData.get("image") as File | null;

  const [row] = await db.select().from(collections).where(eq(collections.id, validId)).limit(1);
  if (!row) return { error: "Collection not found" };

  const [slugRow] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  if (slugRow && slugRow.id !== validId) return { error: "A collection with this slug already exists" };

  let imageUrl: string | null = row.imageUrl;
  if (imageFile?.size) {
    const result = await uploadProductImage(imageFile, `collection-${slug}-${Date.now()}`);
    if (result.error) return { error: result.error };
    imageUrl = result.url ?? row.imageUrl;
  }

  await db
    .update(collections)
    .set({
      name,
      slug,
      description: description || null,
      storeType,
      imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(collections.id, validId));

  auditLog({ userId: userId!, action: "collection.update", target: String(validId), details: { slug, name } });
  return {};
}

export async function deleteCollection(id: number): Promise<{ error?: string }> {
  const validId = z.number().int().positive().parse(id);
  const { userId } = await requireAdmin();

  const [row] = await db.select().from(collections).where(eq(collections.id, validId)).limit(1);
  if (!row) return { error: "Collection not found" };

  await db.delete(collections).where(eq(collections.id, validId));
  auditLog({ userId: userId!, action: "collection.delete", target: String(validId), details: { slug: row.slug } });
  return {};
}
