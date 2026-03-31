import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { wishlists, products, productVariants, productColors } from "@/db/schema";
import { CartClient } from "@/components/CartClient";
import { getProductColorsByProductIds } from "@/actions/storefront-products";

export default async function BagPage() {
  const { userId } = await auth();

  let wishlistProducts: typeof products.$inferSelect[] = [];
  let wishlistProductIds: number[] = [];

  if (userId) {
    const userWishlist = await db
      .select({
        productId: wishlists.productId,
        product: products,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(
        and(eq(wishlists.userId, userId), eq(products.isArchived, false)),
      )
      .orderBy(desc(wishlists.createdAt));

    wishlistProducts = userWishlist.map((w) => w.product);
    wishlistProductIds = wishlistProducts.map((p) => p.id);
  }

  const variantsByProductId: Record<number, typeof productVariants.$inferSelect[]> = {};
  const colorsByProductId: Record<number, typeof productColors.$inferSelect[]> = {};
  if (wishlistProductIds.length > 0) {
    const [variants, colorsList] = await Promise.all([
      db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, wishlistProductIds)),
      getProductColorsByProductIds(wishlistProductIds),
    ]);
    for (const v of variants) {
      if (!variantsByProductId[v.productId]) variantsByProductId[v.productId] = [];
      variantsByProductId[v.productId].push(v);
    }
    for (const c of colorsList) {
      if (!colorsByProductId[c.productId]) colorsByProductId[c.productId] = [];
      colorsByProductId[c.productId].push(c);
    }
  }

  return (
    <div className="pt-14">
      <CartClient
        wishlistProducts={wishlistProducts}
        wishlistProductIds={wishlistProductIds}
        variantsByProductId={variantsByProductId}
        wishlistColorsByProductId={colorsByProductId}
      />
    </div>
  );
}
