"use server";

import { eq, inArray, and, lte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";
import { z } from "zod";
import { requireAdminAction } from "@/lib/security";

function parsePrice(price: string | null | undefined): number {
  if (price == null) return 0;
  const n = parseFloat(String(price));
  return Number.isFinite(n) ? n : 0;
}

function toDecimal(value: number): string {
  return value.toFixed(2);
}

export type ApplyBulkDiscountOptions = {
  productIds: number[];
  discountType: "PERCENTAGE" | "FIXED";
  value: number;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
};

export async function applyBulkDiscount(
  productIds: number[],
  discountType: "PERCENTAGE" | "FIXED",
  value: number,
  options?: { saleStartsAt?: Date | string | null; saleEndsAt?: Date | string | null },
): Promise<void | { success: false; error: string }> {
  const schema = z.object({
    productIds: z.array(z.number().int().positive()),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().positive(),
  });
  const parsed = schema.parse({ productIds, discountType, value });

  const gate = await requireAdminAction({ auditTarget: "bulk_discount.apply" });
  if (!gate.authorized) return gate.response;

  if (parsed.productIds.length === 0) return;

  const saleStartsAt = options?.saleStartsAt
    ? new Date(options.saleStartsAt)
    : null;
  const saleEndsAt = options?.saleEndsAt ? new Date(options.saleEndsAt) : null;

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: products.id, price: products.price })
      .from(products)
      .where(inArray(products.id, productIds));

    for (const row of rows) {
      const price = parsePrice(row.price);
      let salePrice: string | null;

      if (discountType === "PERCENTAGE") {
        const multiplier = 1 - value / 100;
        salePrice = toDecimal(Math.max(0, price * multiplier));
      } else {
        if (value >= price) continue;
        salePrice = toDecimal(value);
      }

      const salePriceNum = parseFloat(salePrice);
      if (salePriceNum <= 0 || salePriceNum >= price) {
        continue;
      }

      await tx
        .update(products)
        .set({
          salePrice,
          saleStartsAt: saleStartsAt ?? undefined,
          saleEndsAt: saleEndsAt ?? undefined,
          isSaleActive: true,
        })
        .where(eq(products.id, row.id));
    }
  });

  auditLog({ userId: gate.userId, action: "bulk_discount.apply", target: parsed.productIds.length.toString(), details: { discountType: parsed.discountType, value: parsed.value, count: parsed.productIds.length } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function removeBulkDiscount(
  productIds: number[],
): Promise<void | { success: false; error: string }> {
  const parsedIds = z.array(z.number().int().positive()).parse(productIds);
  const gate = await requireAdminAction({ auditTarget: "bulk_discount.remove" });
  if (!gate.authorized) return gate.response;

  if (parsedIds.length === 0) return;

  await db
    .update(products)
    .set({
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
      isSaleActive: true,
    })
    .where(inArray(products.id, parsedIds));

  auditLog({ userId: gate.userId, action: "bulk_discount.remove", target: parsedIds.length.toString(), details: { count: parsedIds.length } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

/**
 * Clears expired sales: sets salePrice to null for products where
 * saleEndsAt is in the past. Call periodically (e.g. cron) or on demand.
 */
export async function clearExpiredSales(): Promise<
  { cleared: number } | { success: false; error: string }
> {
  const gate = await requireAdminAction({ auditTarget: "bulk_discount.clearExpired" });
  if (!gate.authorized) return gate.response;

  const now = new Date();
  const expired = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        isNotNull(products.saleEndsAt),
        lte(products.saleEndsAt, now)
      )
    );

  const ids = expired.map((r) => r.id);
  if (ids.length === 0) return { cleared: 0 };

  await db
    .update(products)
    .set({
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
    })
    .where(inArray(products.id, ids));

  auditLog({ userId: gate.userId, action: "bulk_discount.clear_expired", target: String(ids.length), details: { cleared: ids.length } });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  return { cleared: ids.length };
}
