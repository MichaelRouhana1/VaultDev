"use server";

import { cache } from "react";
import { asc, eq, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attributes, attributeValues, productAttributeValues } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { headers } from "next/headers";
import { checkSensitiveOperationLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/security";
import { logger } from "@/lib/logger";
import { z } from "zod";

export type AttributeWithValues = {
  id: number;
  name: string;
  sortOrder: number;
  values: { id: number; name: string; slug: string }[];
};

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export const getAttributesWithValues = cache(async (): Promise<AttributeWithValues[]> => {
  const attrs = await db.select().from(attributes).orderBy(asc(attributes.sortOrder), asc(attributes.id));
  if (attrs.length === 0) return [];
  const vals = await db.select().from(attributeValues).orderBy(asc(attributeValues.id));
  const byAttr = new Map<number, { id: number; name: string; slug: string }[]>();
  for (const v of vals) {
    const list = byAttr.get(v.attributeId) ?? [];
    list.push({ id: v.id, name: v.name, slug: v.slug });
    byAttr.set(v.attributeId, list);
  }
  return attrs.map((a) => ({
    id: a.id,
    name: a.name,
    sortOrder: a.sortOrder,
    values: byAttr.get(a.id) ?? [],
  }));
});

export async function getAttributesWithValuesAdmin(): Promise<AttributeWithValues[]> {
  await requireAdmin();
  return getAttributesWithValues();
}

export async function getProductAttributeValueIds(productId: number): Promise<number[]> {
  const rows = await db
    .select({ id: productAttributeValues.attributeValueId })
    .from(productAttributeValues)
    .where(eq(productAttributeValues.productId, productId));
  return rows.map((r) => r.id);
}

/** Slugs from `?attributes=a,b,c` → value IDs (invalid slugs skipped). */
export async function resolveAttributeSlugsToIds(slugs: string[]): Promise<number[]> {
  const normalized = [...new Set(slugs.map((s) => slugify(s)).filter(Boolean))];
  if (normalized.length === 0) return [];
  const rows = await db
    .select({ id: attributeValues.id })
    .from(attributeValues)
    .where(inArray(attributeValues.slug, normalized));
  return rows.map((r) => r.id);
}

export async function validateAttributeValueIds(ids: number[]): Promise<string | null> {
  const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
  if (unique.length === 0) return null;
  const rows = await db
    .select({ id: attributeValues.id })
    .from(attributeValues)
    .where(inArray(attributeValues.id, unique));
  if (rows.length !== unique.length) return "One or more attribute values are invalid";
  return null;
}

export async function createAttribute(formData: FormData): Promise<{ id?: number; error?: string }> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-attribute-create:${ip}`, { auditIp: ip });
  if (!limit.allowed) return { error: "Too many requests. Please wait before trying again." };

  const { userId } = await requireAdmin();
  try {
    const rows = await db.select({ sortOrder: attributes.sortOrder }).from(attributes);
    const nextSort = rows.length === 0 ? 0 : Math.max(0, ...rows.map((r) => r.sortOrder ?? 0)) + 1;
    const [inserted] = await db
      .insert(attributes)
      .values({ name, sortOrder: nextSort })
      .returning({ id: attributes.id });
    auditLog({ userId: userId!, action: "attribute.create", target: String(inserted.id), details: { name } });
    return { id: inserted.id };
  } catch (e) {
    logger.error("createAttribute failed", e instanceof Error ? e : undefined);
    return { error: "Failed to create attribute" };
  }
}

export async function deleteAttribute(id: number): Promise<{ error?: string }> {
  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { error: "Invalid id" };
  const { userId } = await requireAdmin();
  try {
    await db.delete(attributes).where(eq(attributes.id, parsed.data));
    auditLog({ userId: userId!, action: "attribute.delete", target: String(parsed.data) });
    return {};
  } catch (e) {
    logger.error("deleteAttribute failed", e instanceof Error ? e : undefined);
    return { error: "Failed to delete attribute" };
  }
}

export async function createAttributeValue(
  attributeId: number,
  formData: FormData,
): Promise<{ id?: number; error?: string }> {
  const aid = z.number().int().positive().parse(attributeId);
  const name = (formData.get("name") as string)?.trim();
  let slug = slugify((formData.get("slug") as string) || name || "");
  if (!name) return { error: "Name is required" };
  if (!slug) return { error: "Could not derive slug" };

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkSensitiveOperationLimit(`admin-attribute-value-create:${ip}`, { auditIp: ip });
  if (!limit.allowed) return { error: "Too many requests. Please wait before trying again." };

  const { userId } = await requireAdmin();
  try {
    const [attr] = await db.select().from(attributes).where(eq(attributes.id, aid)).limit(1);
    if (!attr) return { error: "Attribute not found" };

    const existing = await db.select().from(attributeValues).where(eq(attributeValues.slug, slug)).limit(1);
    if (existing.length > 0) return { error: "A value with this slug already exists" };

    const [inserted] = await db
      .insert(attributeValues)
      .values({ attributeId: aid, name, slug })
      .returning({ id: attributeValues.id });
    auditLog({
      userId: userId!,
      action: "attribute_value.create",
      target: String(inserted.id),
      details: { attributeId: aid, name, slug },
    });
    return { id: inserted.id };
  } catch (e) {
    logger.error("createAttributeValue failed", e instanceof Error ? e : undefined);
    return { error: "Failed to create value" };
  }
}

export async function deleteAttributeValue(id: number): Promise<{ error?: string }> {
  const parsed = z.number().int().positive().safeParse(id);
  if (!parsed.success) return { error: "Invalid id" };
  const { userId } = await requireAdmin();
  try {
    const [use] = await db
      .select({ c: count() })
      .from(productAttributeValues)
      .where(eq(productAttributeValues.attributeValueId, parsed.data));
    if (Number(use?.c ?? 0) > 0) {
      return { error: "Cannot delete: products use this value." };
    }
    await db.delete(attributeValues).where(eq(attributeValues.id, parsed.data));
    auditLog({ userId: userId!, action: "attribute_value.delete", target: String(parsed.data) });
    return {};
  } catch (e) {
    logger.error("deleteAttributeValue failed", e instanceof Error ? e : undefined);
    return { error: "Failed to delete value" };
  }
}
