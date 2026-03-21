import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import type { Order } from "@/db/schema";

/** Order must match id + token, not expired, still guest. */
export async function getValidActivationOrder(
  orderId: number,
  activationToken: string,
): Promise<Order | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.activationToken, activationToken)))
    .limit(1);

  if (!order) return null;
  if (order.userId) return null;
  if (!order.activationTokenExpires || order.activationTokenExpires < new Date()) {
    return null;
  }
  return order;
}
