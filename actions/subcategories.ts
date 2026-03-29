"use server";

import { cache } from "react";
import { asc, eq, inArray, count } from "drizzle-orm";
import { db } from "@/db";
import { products, subcategories } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { headers } from "next/headers";
import { checkSensitiveOperationLimit } from "@/lib/rate-limit";
import { subcategorySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/security";
import {
  isSubcategoriesTableMissingError,
  SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE,
} from "@/lib/subcategories-table";
import { z } from "zod";

export type ProductSubcategory = typeof subcategories.$inferSelect;

export const getSubcategoriesForStore = cache(async (storeType: string): Promise<ProductSubcategory[]> => {
  try {
    return await db
      .select()
      .from(subcategories)
      .where(inArray(subcategories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]))
      .orderBy(asc(subcategories.sortOrder), asc(subcategories.id));
  } catch (e) {
    if (isSubcategoriesTableMissingError(e)) return [];
    throw e;
  }
});

export const getAllSubcategories = cache(async (storeType?: string): Promise<ProductSubcategory[]> => {
  try {
    if (storeType != null && storeType !== "") {
      return await db
        .select()
        .from(subcategories)
        .where(inArray(subcategories.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]))
        .orderBy(asc(subcategories.sortOrder), asc(subcategories.id));
    }
    return await db.select().from(subcategories).orderBy(asc(subcategories.sortOrder), asc(subcategories.id));
  } catch (e) {
    if (isSubcategoriesTableMissingError(e)) return [];
    throw e;
  }
});

export async function getAllSubcategoriesAdmin(): Promise<ProductSubcategory[]> {
  await requireAdmin();
  try {
    return await db.select().from(subcategories).orderBy(asc(subcategories.sortOrder), asc(subcategories.id));
  } catch (e) {
    if (isSubcategoriesTableMissingError(e)) return [];
    throw e;
  }
}

export async function createSubcategory(
  formData: FormData,
): Promise<{ id?: number; error?: string }> {
  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const labelRaw = (formData.get("label") as string)?.trim();
  const storeTypeRaw = (formData.get("storeType") as string) || "both";

  const parsed = subcategorySchema.safeParse({
    slug: slugRaw,
    label: labelRaw,
    storeType: storeTypeRaw,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Create subcategory validation failed", undefined, { errorDetails });
    return { error: errorDetails };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-subcategory-create:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    return { error: "Too many requests. Please wait before trying again." };
  }

  const { userId } = await requireAdmin();
  const { slug, label, storeType } = parsed.data;

  try {
    const existing = await db.select().from(subcategories).where(eq(subcategories.slug, slug)).limit(1);
    if (existing.length > 0) return { error: "A subcategory with this slug already exists" };

    const rows = await db.select({ sortOrder: subcategories.sortOrder }).from(subcategories);
    const nextSortOrder = rows.length === 0 ? 0 : Math.max(0, ...rows.map((r) => r.sortOrder ?? 0)) + 1;

    const [inserted] = await db
      .insert(subcategories)
      .values({
        slug,
        label,
        image: null,
        sortOrder: nextSortOrder,
        storeType,
      })
      .returning({ id: subcategories.id });
    auditLog({ userId: userId!, action: "subcategory.create", target: slug, details: { label } });
    return { id: inserted.id };
  } catch (e) {
    if (isSubcategoriesTableMissingError(e)) {
      return { error: SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE };
    }
    throw e;
  }
}

export async function updateSubcategory(
  id: number,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const parsedId = z.number().int().positive().safeParse(id);
  if (!parsedId.success) return { success: false, error: "Validation failed" };
  const validId = parsedId.data;

  const slugRaw = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const labelRaw = (formData.get("label") as string)?.trim();
  const storeTypeRaw = (formData.get("storeType") as string) || "both";

  const parsed = subcategorySchema.safeParse({
    slug: slugRaw,
    label: labelRaw,
    storeType: storeTypeRaw,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-subcategory-update:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const { userId } = await requireAdmin();
  const { slug, label, storeType } = parsed.data;

  try {
    const [existing] = await db.select().from(subcategories).where(eq(subcategories.id, validId)).limit(1);
    if (!existing) return { error: "Subcategory not found" };

    const slugRow = await db.select().from(subcategories).where(eq(subcategories.slug, slug)).limit(1);
    if (slugRow.length > 0 && slugRow[0].id !== validId) return { error: "A subcategory with this slug already exists" };

    await db
      .update(subcategories)
      .set({ slug, label, image: null, storeType })
      .where(eq(subcategories.id, validId));
    auditLog({ userId: userId!, action: "subcategory.update", target: String(validId), details: { slug, label } });
    return {};
  } catch (e) {
    if (isSubcategoriesTableMissingError(e)) {
      return { error: SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE };
    }
    throw e;
  }
}

export async function deleteSubcategory(id: number): Promise<{ error?: string }> {
  const { userId } = await requireAdmin();
  const validId = z.number().int().positive().parse(id);

  try {
    const [existing] = await db.select().from(subcategories).where(eq(subcategories.id, validId)).limit(1);
    if (!existing) return { error: "Subcategory not found" };

    const [use] = await db.select({ c: count() }).from(products).where(eq(products.subcategoryId, validId));
    if (Number(use?.c ?? 0) > 0) {
      return { error: "Cannot delete: products use this subcategory." };
    }

    await db.delete(subcategories).where(eq(subcategories.id, validId));
    auditLog({ userId: userId!, action: "subcategory.delete", target: String(validId), details: { slug: existing.slug } });
    return {};
  } catch (e) {
    if (isSubcategoriesTableMissingError(e)) {
      return { error: SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE };
    }
    throw e;
  }
}
