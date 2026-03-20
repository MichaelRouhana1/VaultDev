"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import type { Product, ProductVariant } from "@/db/schema";

const MAX_IDS = 100;

/** Load visible products + variants for wishlist IDs (e.g. guest cart favourites tab). */
export async function getWishlistProductsData(
  productIds: unknown
): Promise<{
  products: Product[];
  variantsByProductId: Record<number, ProductVariant[]>;
}> {
  const parsed = z.array(z.number().int().positive()).safeParse(productIds);
  if (!parsed.success || parsed.data.length === 0) {
    return { products: [], variantsByProductId: {} };
  }

  const ids = [...new Set(parsed.data)].slice(0, MAX_IDS);

  const prods = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isVisible, true)));

  const order = new Map(ids.map((id, i) => [id, i]));
  prods.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const foundIds = prods.map((p) => p.id);
  const variantsByProductId: Record<number, ProductVariant[]> = {};
  if (foundIds.length > 0) {
    const variants = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, foundIds));
    for (const v of variants) {
      if (!variantsByProductId[v.productId]) variantsByProductId[v.productId] = [];
      variantsByProductId[v.productId].push(v);
    }
  }

  return { products: prods, variantsByProductId };
}
