"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { wishlists } from "@/db/schema";
import { checkToggleWishlistLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

export async function toggleWishlist(productId: number): Promise<{
  success?: boolean;
  error?: string;
  inWishlist?: boolean;
}> {
  const validProductId = z.number().int().positive().parse(productId);
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to add to favorites" };
  }
  const limit = await checkToggleWishlistLimit(userId);
  if (!limit.allowed) {
    logger.warn("Rate limit exceeded for toggleWishlist", { userId });
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }

  const existing = await db
    .select()
    .from(wishlists)
    .where(
      and(
        eq(wishlists.userId, userId),
        eq(wishlists.productId, validProductId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          eq(wishlists.productId, validProductId)
        )
      );
    return { inWishlist: false };
  }

  const dupCheck = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, validProductId)))
    .limit(1);
  if (dupCheck.length > 0) {
    return { inWishlist: true };
  }

  try {
    await db.insert(wishlists).values({
      userId,
      productId: validProductId,
    });
  } catch (err) {
    logger.warn("toggleWishlist insert race or constraint", { userId, validProductId, err });
    const after = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, validProductId)))
      .limit(1);
    return { inWishlist: after.length > 0 };
  }
  return { inWishlist: true };
}
