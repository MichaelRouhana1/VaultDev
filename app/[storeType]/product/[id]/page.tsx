import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, inArray, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, productVariants, productColors, wishlists } from "@/db/schema";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string; storeType: string }> }): Promise<Metadata> {
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) return { title: "VAULT | Product Not Found" };

  const [product] = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return {
    title: product ? `VAULT | ${product.name}` : "VAULT | Product",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string; storeType: string }>;
}) {
  const { id, storeType } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeType, storeType as "streetwear" | "formal")))
    .limit(1);

  if (!product || !product.isVisible) notFound();

  const [variants, colors] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
    db.select().from(productColors).where(eq(productColors.productId, product.id)),
  ]);

  const firstColorImages = colors[0]?.imageUrls ?? [];
  const productWithImages = { ...product, images: firstColorImages };

  const categorySlug = product.categorySlug ?? "trousers";
  const similarProducts = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isVisible, true),
        eq(products.categorySlug, categorySlug),
        eq(products.storeType, storeType as "streetwear" | "formal"),
        ne(products.id, productId)
      )
    )
    .limit(10);

  const similarProductIds = similarProducts.map((p) => p.id);
  const [similarVariants, similarColors] =
    similarProductIds.length > 0
      ? await Promise.all([
        db.select().from(productVariants).where(inArray(productVariants.productId, similarProductIds)),
        db.select().from(productColors).where(inArray(productColors.productId, similarProductIds)),
      ])
      : [[], []];

  const similarFirstImageByProductId: Record<number, string> = {};
  for (const c of similarColors) {
    if (!similarFirstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      similarFirstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  const similarProductsWithImages = similarProducts.map((p) => ({
    ...p,
    images: similarFirstImageByProductId[p.id] ? [similarFirstImageByProductId[p.id]] : [],
  }));

  const variantsByProductId = similarVariants.reduce<
    Record<number, typeof productVariants.$inferSelect[]>
  >((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push(v);
    return acc;
  }, {});

  let wishlistProductIds: number[] = [];
  const { userId } = await auth();
  if (userId) {
    const userWishlist = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    wishlistProductIds = userWishlist.map((w) => w.productId);
  }

  const inWishlist = wishlistProductIds.includes(product.id);

  return (
    <div className="pt-14">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 px-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/${storeType}/shop`} className="hover:text-foreground capitalize">{storeType}</Link>
        {product.categorySlug && (
          <>
            <span>/</span>
            <span className="text-foreground capitalize">{product.categorySlug.replace(/-/g, ' ')}</span>
          </>
        )}
      </div>
      <ProductDetailClient
        product={productWithImages}
        variants={variants}
        colors={colors}
        inWishlist={inWishlist}
        similarProducts={similarProductsWithImages}
        variantsByProductId={variantsByProductId}
        wishlistProductIds={wishlistProductIds}
      />
    </div>
  );
}
