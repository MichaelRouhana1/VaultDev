"use server";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { asc, eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { productCategories } from "@/db/schema";
import { uploadProductImage } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { headers } from "next/headers";
import { checkSensitiveOperationLimit } from "@/lib/rate-limit";

export type ProductCategory = typeof productCategories.$inferSelect;

import { z } from "zod";
import { categorySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

/** Valid slugs for shop filtering (from DB) */
export const getValidCategorySlugs = cache(async (): Promise<string[]> => {
  const cats = await db.select({ slug: productCategories.slug }).from(productCategories);
  return cats.map((c) => c.slug);
});

/** Get all category slugs for a specific storeType */
export const getStoreCategorySlugs = cache(async (storeType: string): Promise<string[]> => {
  const cats = await db
    .select({ slug: productCategories.slug })
    .from(productCategories)
    .where(inArray(productCategories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]));
  return cats.map((c) => c.slug);
});

/** Get only the category definitions for a specific store type */
export const getStoreCategories = cache(async (storeType: string): Promise<ProductCategory[]> => {
  return db
    .select()
    .from(productCategories)
    .where(inArray(productCategories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.id));
});

/** All categories for burger menu, shop, etc. */
export const getCategories = cache(async (storeType?: string): Promise<ProductCategory[]> => {
  const conditions = [];
  if (storeType) {
    conditions.push(inArray(productCategories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]));
  }
  return db
    .select()
    .from(productCategories)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.id));
});

/** Fetch subcategories for a given parent */
export const getSubcategories = cache(async (parentId: number): Promise<ProductCategory[]> => {
  return db
    .select()
    .from(productCategories)
    .where(eq(productCategories.parentId, parentId))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.id));
});

/** Categories to show on home page (show_on_home, limit 6 per store) */
export const getCategoriesForHome = cache(async (storeType: string): Promise<ProductCategory[]> => {
  return db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.showOnHome, true),
        inArray(productCategories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]),
      ),
    )
    .orderBy(asc(productCategories.sortOrder))
    .limit(6);
});

/** Admin: get all categories */
export async function getAllCategories(): Promise<ProductCategory[]> {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "category.list" });
    redirect("/");
  }
  return getCategories();
}

/** Admin: create category */
export async function createCategory(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const labelRaw = (formData.get("label") as string)?.trim();
  const showOnHomeRaw = formData.get("showOnHome") === "true";
  const parentIdStr = formData.get("parentId") as string | null;
  const parentIdRaw = parentIdStr ? parseInt(parentIdStr, 10) : null;
  const levelRaw = (formData.get("level") as string) || "main";
  const storeTypeRaw = (formData.get("storeType") as string) || "both";

  const parsed = categorySchema.safeParse({
    slug: slugRaw,
    label: labelRaw,
    showOnHome: showOnHomeRaw,
    parentId: parentIdRaw,
    level: levelRaw,
    storeType: storeTypeRaw,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Create category validation failed", undefined, { errorDetails, formData: Array.from(formData.entries()) });
    return { success: false, error: errorDetails };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-category-create:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    logger.warn("Rate limit exceeded for admin-category-create", { ip });
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "category.create" });
    redirect("/");
  }

  const { slug, label, showOnHome, parentId, level, storeType } = parsed.data;
  const imageFile = formData.get("image") as File | null;

  const existing = await db.select().from(productCategories).where(eq(productCategories.slug, slug)).limit(1);
  if (existing.length > 0) return { error: "A category with this slug already exists" };

  if (showOnHome) {
    const homeCount = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(eq(productCategories.showOnHome, true), eq(productCategories.storeType, storeType)));
    if (homeCount.length >= 6) return { error: `Maximum 6 categories can be shown on the ${storeType} home page` };
  }

  let imageUrl: string | null = null;
  if (imageFile?.size) {
    const result = await uploadProductImage(imageFile, `category-${slug}-${Date.now()}`);
    if (result.error) return { error: result.error };
    imageUrl = result.url ?? null;
  }

  const allCats = await db.select({ sortOrder: productCategories.sortOrder }).from(productCategories);
  const nextSortOrder =
    allCats.length === 0 ? 0 : Math.max(0, ...allCats.map((r) => r.sortOrder ?? 0)) + 1;

  await db.insert(productCategories).values({
    slug,
    label,
    image: imageUrl,
    showOnHome,
    sortOrder: nextSortOrder,
    parentId,
    level,
    storeType,
  });
  auditLog({ userId: userId!, action: "category.create", target: slug, details: { label } });
  return {};
}

/** Admin: update category */
export async function updateCategory(
  id: number,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const parsedId = z.number().int().positive().safeParse(id);
  if (!parsedId.success) {
    logger.error("Update category invalid ID", undefined, { id });
    return { success: false, error: "Validation failed" };
  }
  const validId = parsedId.data;

  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const labelRaw = (formData.get("label") as string)?.trim();
  const showOnHomeRaw = formData.get("showOnHome") === "true";
  const parentIdStr = formData.get("parentId") as string | null;
  const parentIdRaw = parentIdStr ? parseInt(parentIdStr, 10) : null;
  const levelRaw = (formData.get("level") as string) || "main";
  const storeTypeRaw = (formData.get("storeType") as string) || "both";

  const parsed = categorySchema.safeParse({
    slug: slugRaw,
    label: labelRaw,
    showOnHome: showOnHomeRaw,
    parentId: parentIdRaw,
    level: levelRaw,
    storeType: storeTypeRaw,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Update category validation failed", undefined, { errorDetails, formData: Array.from(formData.entries()), id });
    return { success: false, error: errorDetails };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-category-update:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    logger.warn("Rate limit exceeded for admin-category-update", { ip, id });
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "category.update" });
    redirect("/");
  }

  const { slug, label, showOnHome, parentId, level, storeType } = parsed.data;
  const imageFile = formData.get("image") as File | null;

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, validId)).limit(1);
  if (!existing) return { error: "Category not found" };

  const existingSlug = await db.select().from(productCategories).where(eq(productCategories.slug, slug)).limit(1);
  if (existingSlug.length > 0 && existingSlug[0].id !== id) return { error: "A category with this slug already exists" };

  if (showOnHome && !existing.showOnHome) {
    const homeCount = await db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(and(eq(productCategories.showOnHome, true), eq(productCategories.storeType, storeType)));
    if (homeCount.length >= 6) return { error: `Maximum 6 categories can be shown on the ${storeType} home page` };
  }

  let imageUrl: string | null = existing.image;
  if (imageFile?.size) {
    const result = await uploadProductImage(imageFile, `category-${slug}-${Date.now()}`);
    if (result.error) return { error: result.error };
    imageUrl = result.url ?? existing.image;
  }

  await db
    .update(productCategories)
    .set({ slug, label, image: imageUrl, showOnHome, parentId, level, storeType })
    .where(eq(productCategories.id, validId));
  auditLog({ userId: userId!, action: "category.update", target: String(validId), details: { slug, label } });
  return {};
}

/** Admin: delete category */
export async function deleteCategory(id: number): Promise<{ error?: string }> {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "category.delete" });
    redirect("/");
  }

  const validId = z.number().int().positive().parse(id);

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, validId)).limit(1);
  if (!existing) return { error: "Category not found" };

  await db.delete(productCategories).where(eq(productCategories.id, validId));
  auditLog({ userId: userId!, action: "category.delete", target: String(validId), details: { slug: existing.slug } });
  return {};
}
