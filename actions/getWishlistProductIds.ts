"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wishlists } from "@/db/schema";

export async function getWishlistProductIds(): Promise<number[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const rows = await db
    .select({ productId: wishlists.productId })
    .from(wishlists)
    .where(eq(wishlists.userId, userId));
  return rows.map((r) => r.productId);
}
