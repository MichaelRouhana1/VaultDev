"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inventorySettings } from "@/db/schema";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/low-stock-threshold";
import { requireAdminAction } from "@/lib/security";

export async function getLowStockThreshold(): Promise<number> {
  const rows = await db
    .select({ lowStockThreshold: inventorySettings.lowStockThreshold })
    .from(inventorySettings)
    .where(eq(inventorySettings.id, 1))
    .limit(1);
  const v = rows[0]?.lowStockThreshold;
  return typeof v === "number" && Number.isFinite(v) ? v : DEFAULT_LOW_STOCK_THRESHOLD;
}

const thresholdSchema = z.coerce
  .number()
  .int("Must be a whole number")
  .min(1, "Must be at least 1")
  .max(999_999, "Must be at most 999999");

export async function updateLowStockThreshold(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const gate = await requireAdminAction({ auditTarget: "inventory.low_stock_threshold.update" });
  if (!gate.authorized) {
    return { error: gate.response.error };
  }

  const parsed = thresholdSchema.safeParse(formData.get("threshold"));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid threshold";
    return { error: msg };
  }

  const threshold = parsed.data;

  await db
    .insert(inventorySettings)
    .values({
      id: 1,
      lowStockThreshold: threshold,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: inventorySettings.id,
      set: {
        lowStockThreshold: threshold,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/products");

  return { ok: true };
}
