"use server";

import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";
import { getProductIdsLinkedToOrders } from "@/lib/product-delete-guards";

const idsSchema = z.array(z.number().int().positive()).min(1).max(500);

const FK_VIOLATION = "23503";

function isFkViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === FK_VIOLATION || e.cause?.code === FK_VIOLATION;
}

export async function bulkForceDeleteProducts(
  productIds: number[],
): Promise<
  | { success: true; deleted: number }
  | { success: false; error: string; blockedByOrders?: number[] }
> {
  const gate = await requireAdminAction({ auditTarget: "product.bulk_force_delete" });
  if (!gate.authorized) return gate.response;

  const parse = idsSchema.safeParse(productIds);
  if (!parse.success) {
    return { success: false, error: "Invalid product selection (1–500 ids)." };
  }
  const ids = [...new Set(parse.data)];

  const blocked = await getProductIdsLinkedToOrders(ids);
  if (blocked.length > 0) {
    return {
      success: false,
      error:
        "Cannot force delete one or more products because they are linked to past orders. Remove those from the selection or archive them instead.",
      blockedByOrders: blocked,
    };
  }

  try {
    const removed = await db.delete(products).where(inArray(products.id, ids)).returning({ id: products.id });
    auditLog({
      userId: gate.userId,
      action: "product.bulk_force_delete",
      target: ids.join(","),
      details: { count: removed.length, ids },
    });
    return { success: true, deleted: removed.length };
  } catch (err) {
    if (isFkViolation(err)) {
      return {
        success: false,
        error:
          "Cannot force delete one or more products because they are linked to other records. Please archive instead.",
      };
    }
    throw err;
  }
}
