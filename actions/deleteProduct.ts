"use server";

import { z } from "zod";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";

export async function deleteProduct(
  productId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "product.archive" });
  if (!gate.authorized) return gate.response;

  const id = z.number().int().positive().parse(productId);

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    return { success: false, error: "Product not found" };
  }
  if (existing.isArchived) {
    return { success: false, error: "Product is already archived" };
  }

  await db.update(products).set({ isArchived: true }).where(eq(products.id, id));
  auditLog({ userId: gate.userId, action: "product.archive", target: String(id) });
  return { success: true };
}
