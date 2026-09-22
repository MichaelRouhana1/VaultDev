"use server";

import { db } from "@/db";
import { orderItems, orders, productVariants } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";
import { z } from "zod";
import { requireAdminAction } from "@/lib/security";

const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const RESTOCK_FROM: ReadonlySet<OrderStatus> = new Set(["PENDING", "PROCESSING"]);

class OrderStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStatusError";
  }
}

function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;
  if (from === "CANCELLED") {
    throw new OrderStatusError("Cancelled orders cannot be reopened. Stock was already returned.");
  }
  if (to === "CANCELLED" && (from === "SHIPPED" || from === "DELIVERED")) {
    throw new OrderStatusError(
      "Cannot cancel a shipped or delivered order. Stock is not returned after the order has left.",
    );
  }
}

async function restockOrderItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: number,
): Promise<{ productId: number; size: string; quantity: number }[]> {
  const items = await tx
    .select({
      productId: orderItems.productId,
      size: orderItems.size,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const qtyByKey = new Map<string, { productId: number; size: string; quantity: number }>();
  for (const item of items) {
    const key = `${item.productId}|${item.size}`;
    const existing = qtyByKey.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      qtyByKey.set(key, {
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
      });
    }
  }

  const restocked: { productId: number; size: string; quantity: number }[] = [];

  for (const line of qtyByKey.values()) {
    const [variant] = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.productId, line.productId), eq(productVariants.size, line.size)))
      .limit(1);

    if (!variant) {
      throw new OrderStatusError(
        `Cannot restore stock: no variant for product #${line.productId} size ${line.size}.`,
      );
    }

    await tx
      .update(productVariants)
      .set({
        stock: sql`${productVariants.stock} + ${line.quantity}`,
        stockQuantity: sql`${productVariants.stockQuantity} + ${line.quantity}`,
      })
      .where(eq(productVariants.id, variant.id));

    restocked.push(line);
  }

  return restocked;
}

export async function updateOrderStatus(
  orderId: number,
  newStatus: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const validOrderId = z.number().int().positive().parse(orderId);
    const validStatus = z.enum(VALID_STATUSES).parse(newStatus);

    const gate = await requireAdminAction({ auditTarget: "order.status_update" });
    if (!gate.authorized) return { ...gate.response };
    const { userId } = gate;

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM orders WHERE id = ${validOrderId} FOR UPDATE`);

      const [order] = await tx
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.id, validOrderId))
        .limit(1);

      if (!order) {
        throw new OrderStatusError("Order not found");
      }

      const previousStatus = order.status;
      if (previousStatus === validStatus) {
        return { previousStatus, restocked: [] as { productId: number; size: string; quantity: number }[] };
      }

      assertTransition(previousStatus, validStatus);

      const restocked =
        validStatus === "CANCELLED" && RESTOCK_FROM.has(previousStatus)
          ? await restockOrderItems(tx, validOrderId)
          : [];

      await tx
        .update(orders)
        .set({ status: validStatus })
        .where(eq(orders.id, validOrderId));

      return { previousStatus, restocked };
    });

    auditLog({
      userId: userId!,
      action: "order.status_update",
      target: String(validOrderId),
      details: {
        previousStatus: result.previousStatus,
        newStatus: validStatus,
        restocked: result.restocked.length > 0,
        restockedItems: result.restocked,
      },
    });
    revalidatePath(`/admin/orders/${validOrderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || "Validation failed" };
    }
    if (error instanceof OrderStatusError) {
      return { error: error.message };
    }
    return { error: "An unexpected error occurred" };
  }
}
