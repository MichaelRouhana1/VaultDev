import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems } from "@/db/schema";

/** Product IDs that appear on at least one order line (blocks hard delete). */
export async function getProductIdsLinkedToOrders(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const rows = await db
    .selectDistinct({ productId: orderItems.productId })
    .from(orderItems)
    .where(inArray(orderItems.productId, unique));
  return rows.map((r) => r.productId).filter((id): id is number => id != null);
}
