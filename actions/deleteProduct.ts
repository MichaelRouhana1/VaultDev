"use server";

import { z } from "zod";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productColors } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { deleteFromR2 } from "@/lib/uploadImages";
import { requireAdminAction } from "@/lib/security";

export async function deleteProduct(
  productId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "product.delete" });
  if (!gate.authorized) return gate.response;

  const id = z.number().int().positive().parse(productId);

  const colors = await db.select({ imageUrls: productColors.imageUrls }).from(productColors).where(eq(productColors.productId, id));
  for (const color of colors) {
    for (const url of color.imageUrls ?? []) {
      await deleteFromR2(url);
    }
  }

  await db.delete(products).where(eq(products.id, id));
  auditLog({ userId: gate.userId, action: "product.delete", target: String(id) });
  return { success: true };
}
