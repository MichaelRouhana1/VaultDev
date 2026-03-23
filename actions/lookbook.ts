"use server";

import { asc, eq, max, and } from "drizzle-orm";
import { db } from "@/db";
import { lookbookItems, sectionSettings } from "@/db/schema";
import { uploadLookImage, deleteFromR2 } from "@/lib/uploadImages";
import { validateHref, requireAdmin, requireAdminAction } from "@/lib/security";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const LOOKBOOK_SECTION_KEY = "lookbook";

/** Returns whether the Get the Look section is visible on the home page. Defaults to true. */
export async function getLookbookSectionVisible(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(sectionSettings)
    .where(eq(sectionSettings.sectionKey, LOOKBOOK_SECTION_KEY))
    .limit(1);
  return row?.isVisible ?? true;
}

/** Sets whether the Get the Look section is visible. Admin only. */
export async function setLookbookSectionVisible(visible: boolean) {
  const validatedVisible = z.boolean().parse(visible);
  await requireAdmin();

  const [existing] = await db
    .select()
    .from(sectionSettings)
    .where(eq(sectionSettings.sectionKey, LOOKBOOK_SECTION_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(sectionSettings)
      .set({ isVisible: validatedVisible })
      .where(eq(sectionSettings.id, existing.id));
  } else {
    await db.insert(sectionSettings).values({
      sectionKey: LOOKBOOK_SECTION_KEY,
      isVisible: validatedVisible,
    });
  }
}

export async function getLookbookItems(storeType?: string) {
  const conditions = [eq(lookbookItems.isActive, true)];
  if (storeType) {
    const validatedStore = z.enum(["streetwear", "formal"]).parse(storeType);
    conditions.push(eq(lookbookItems.storeType, validatedStore));
  }
  return db
    .select()
    .from(lookbookItems)
    .where(and(...conditions))
    .orderBy(asc(lookbookItems.order));
}

/** Fetches all lookbook items for admin. */
export async function getAllLookbookItems() {
  await requireAdmin();
  return db
    .select()
    .from(lookbookItems)
    .orderBy(asc(lookbookItems.order));
}

export async function deleteLookbookItem(id: number) {
  const validId = z.number().int().positive().parse(id);
  const { userId } = await requireAdmin();
  const [item] = await db.select({ imageUrl: lookbookItems.imageUrl }).from(lookbookItems).where(eq(lookbookItems.id, validId)).limit(1);
  if (item?.imageUrl) await deleteFromR2(item.imageUrl);
  await db.delete(lookbookItems).where(eq(lookbookItems.id, validId));
  auditLog({ userId, action: "lookbook.delete", target: String(validId) });
}

export async function updateLookbookItem(
  id: number,
  data: { label?: string; href?: string; order?: number; storeType?: "streetwear" | "formal" | "both" }
) {
  const validId = z.number().int().positive().parse(id);
  const { userId } = await requireAdmin();
  const updateSchema = z.object({
    label: z.string().optional(),
    href: z.string().optional(),
    order: z.number().int().optional(),
    storeType: z.enum(["streetwear", "formal", "both"]).optional(),
  });
  const parsedData = updateSchema.parse(data);

  const updateData: typeof parsedData = { ...parsedData };
  if (parsedData.href !== undefined) {
    const validated = validateHref(parsedData.href);
    if (!validated.ok) throw new Error(validated.error);
    updateData.href = validated.href;
  }
  await db.update(lookbookItems).set(updateData).where(eq(lookbookItems.id, validId));
  auditLog({ userId, action: "lookbook.update", target: String(validId), details: updateData });
}

/** Uploads a look image and adds it to the database. Admin only. */
export async function addLookbookItemFromFile(formData: FormData): Promise<{ error?: string }> {
  const gate = await requireAdminAction({ auditTarget: "lookbook.add" });
  if (!gate.authorized) return { error: gate.response.error };
  const { userId } = gate;

  const file = formData.get("image") as File | null;
  const labelRaw = (formData.get("label") as string)?.trim();
  const storeTypeRaw = (formData.get("storeType") as string) || "both";
  const hrefRawValue = ((formData.get("href") as string)?.trim()) || "/shop";

  const addSchema = z.object({
    label: z.string().min(1),
    storeType: z.enum(["streetwear", "formal", "both"]).default("both"),
  });

  const parsedData = addSchema.safeParse({
    label: labelRaw,
    storeType: storeTypeRaw,
  });

  if (!parsedData.success) {
    return { error: parsedData.error.issues[0]?.message || "Validation failed" };
  }

  const { label, storeType } = parsedData.data;

  const hrefValidation = validateHref(hrefRawValue);
  if (!hrefValidation.ok) return { error: hrefValidation.error };
  const href = hrefValidation.href;

  if (!file?.size) return { error: "No image provided" };

  const filename = `look-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadLookImage(file, filename);
  if (result.error) return { error: result.error };
  if (!result.url) return { error: "Upload failed" };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(lookbookItems.order) })
    .from(lookbookItems);
  const nextOrder = (maxOrder ?? -1) + 1;

  const [inserted] = await db.insert(lookbookItems).values({
    label,
    imageUrl: result.url,
    href,
    order: nextOrder,
    storeType,
  }).returning({ id: lookbookItems.id });
  if (inserted) auditLog({ userId, action: "lookbook.add", target: String(inserted.id), details: { label } });
  return {};
}
