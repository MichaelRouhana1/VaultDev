"use server";

import { z } from "zod";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";

export async function unarchiveProduct(
  productId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "product.unarchive" });
  if (!gate.authorized) return gate.response;

  const id = z.number().int().positive().parse(productId);

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    return { success: false, error: "Product not found" };
  }
  if (!existing.isArchived) {
    return { success: false, error: "Product is not archived" };
  }

  await db.update(products).set({ isArchived: false }).where(eq(products.id, id));
  auditLog({ userId: gate.userId, action: "product.unarchive", target: String(id) });
  return { success: true };
}
