"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getProductIdsLinkedToOrders } from "@/lib/product-delete-guards";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";

const FK_VIOLATION = "23503";

function isFkViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === FK_VIOLATION || e.cause?.code === FK_VIOLATION;
}

export async function forceDeleteProduct(
  productId: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "product.force_delete" });
  if (!gate.authorized) return gate.response;

  const id = z.number().int().positive().parse(productId);

  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (!existing) {
    return { success: false, error: "Product not found" };
  }

  const linked = await getProductIdsLinkedToOrders([id]);
  if (linked.length > 0) {
    return {
      success: false,
      error:
        "Cannot force delete this product because it is linked to past orders. Please archive it instead.",
    };
  }

  try {
    await db.delete(products).where(eq(products.id, id));
  } catch (err) {
    if (isFkViolation(err)) {
      return {
        success: false,
        error:
          "Cannot force delete this product because it is linked to past orders. Please archive it instead.",
      };
    }
    throw err;
  }

  auditLog({ userId: gate.userId, action: "product.force_delete", target: String(id) });
  return { success: true };
}
