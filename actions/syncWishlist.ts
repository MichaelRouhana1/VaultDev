"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { wishlists, products } from "@/db/schema";
import { checkSensitiveOperationLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";

const MAX_IDS = 200;

/**
 * Merge guest wishlist IDs into the signed-in user's DB wishlist.
 * Skips duplicates and invalid / missing product IDs.
 */
export async function syncWishlist(
  productIds: unknown
): Promise<{ inserted: number; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { inserted: 0, error: "Unauthorized" };
  }

  const parsed = z.array(z.number().int().positive()).safeParse(productIds);
  if (!parsed.success) {
    return { inserted: 0, error: "Invalid product list" };
  }

  const uniqueIds = [...new Set(parsed.data)].slice(0, MAX_IDS);
  if (uniqueIds.length === 0) {
    return { inserted: 0 };
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";
  const limit = await checkSensitiveOperationLimit(`wishlist-sync:${ip}`, { auditIp: ip });
  if (!limit.allowed) {
    logger.warn("Rate limit exceeded for wishlist-sync", { ip });
    return { inserted: 0, error: "Too many requests. Please try again shortly." };
  }

  const existing = await db
    .select({ productId: wishlists.productId })
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), inArray(wishlists.productId, uniqueIds)));

  const have = new Set(existing.map((r) => r.productId));
  const toAdd = uniqueIds.filter((id) => !have.has(id));
  if (toAdd.length === 0) {
    return { inserted: 0 };
  }

  const validProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(and(inArray(products.id, toAdd), eq(products.isVisible, true)));

  const validSet = new Set(validProducts.map((p) => p.id));
  let inserted = 0;

  for (const productId of toAdd) {
    if (!validSet.has(productId)) continue;
    const stillThere = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);
    if (stillThere.length > 0) continue;

    try {
      await db.insert(wishlists).values({ userId, productId });
      inserted += 1;
    } catch (err) {
      logger.warn("syncWishlist insert skipped (race or constraint)", { userId, productId, err });
    }
  }

  return { inserted };
}
