"use server";

import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";

const idsSchema = z.array(z.number().int().positive()).min(1).max(500);

export async function bulkUnarchiveProducts(
  productIds: number[],
): Promise<{ success: true; unarchived: number } | { success: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "product.bulk_unarchive" });
  if (!gate.authorized) return gate.response;

  const parse = idsSchema.safeParse(productIds);
  if (!parse.success) {
    return { success: false, error: "Invalid product selection (1–500 ids)." };
  }
  const ids = [...new Set(parse.data)];

  const updated = await db
    .update(products)
    .set({ isArchived: false })
    .where(inArray(products.id, ids))
    .returning({ id: products.id });

  auditLog({
    userId: gate.userId,
    action: "product.bulk_unarchive",
    target: ids.join(","),
    details: { count: updated.length, ids },
  });

  return { success: true, unarchived: updated.length };
}
