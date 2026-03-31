import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { productVariants, wishlists } from "@/db/schema";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import type { Metadata } from "next";
import {
  getPublicProductTitleForMetadata,
  getPublicProductDetailForStore,
  getSimilarVisibleProductsExcept,
  getProductVariantsByProductIds,
  getProductColorsByProductIds,
  getPrimaryCategorySlugForProduct,
} from "@/actions/storefront-products";
import { storefrontLocaleFromParam } from "@/lib/storefront-product-locale";
import { getProductPageAccordionCopy } from "@/actions/product-page-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string; storeType: string }>;
}): Promise<Metadata> {
  const { id, locale: localeParam } = await params;
  const locale = storefrontLocaleFromParam(localeParam);
  const productId = parseInt(id, 10);
  if (isNaN(productId)) return { title: "VAULT | Product Not Found" };

  const [product] = await getPublicProductTitleForMetadata(productId, locale);

  return {
    title: product ? `VAULT | ${product.name}` : "VAULT | Product",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; storeType: string }>;
}) {
  const { id, storeType, locale: localeParam } = await params;
  const locale = storefrontLocaleFromParam(localeParam);
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const st = storeType as "streetwear" | "formal";
  const [product] = await getPublicProductDetailForStore(productId, st, locale);

  if (!product || !product.isVisible || product.isArchived) notFound();

  const [variants, colors] = await Promise.all([
    getProductVariantsByProductIds([product.id]),
    getProductColorsByProductIds([product.id]),
  ]);

  const firstColorImages = colors[0]?.imageUrls ?? [];
  const productWithImages = { ...product, images: firstColorImages };

  const primaryCategorySlug = await getPrimaryCategorySlugForProduct(productId);
  const similarProducts = await getSimilarVisibleProductsExcept(productId, st, locale, 30);

  const similarProductIds = similarProducts.map((p) => p.id);
  const [similarVariants, similarColors] =
    similarProductIds.length > 0
      ? await Promise.all([
        getProductVariantsByProductIds(similarProductIds),
        getProductColorsByProductIds(similarProductIds),
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

  const productPageAccordionCopy = await getProductPageAccordionCopy(st);

  return (
    <div className="pt-14">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 px-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/${storeType}/shop`} className="hover:text-foreground capitalize">{storeType}</Link>
        {primaryCategorySlug && (
          <>
            <span>/</span>
            <span className="text-foreground capitalize">{primaryCategorySlug.replace(/-/g, " ")}</span>
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
        listStoreType={st}
        productPageAccordionCopy={productPageAccordionCopy}
      />
    </div>
  );
}
