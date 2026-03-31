import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { productColors, productVariants, wishlists } from "@/db/schema";
import { ShopClient } from "@/components/ShopClient";
import { getValidCategorySlugs, getStoreCategorySlugs, getStoreCategories } from "@/actions/categories";
import {
  getShopProductsForStore,
  getShopAttributeFacetsForListingContext,
  getShopProductIdsForListingContext,
  getProductVariantsByProductIds,
  getProductColorsByProductIds,
  getPrimaryCategorySlugByProductIds,
  getProductCategoryFilterTagsByProductIds,
  getProductAttributeValueSlugsByProductIds,
} from "@/actions/storefront-products";
import { storefrontLocaleFromParam } from "@/lib/storefront-product-locale";
import { Suspense } from "react";
import { notFound } from "next/navigation";

interface ShopPageProps {
  params: Promise<{ locale: string; storeType: string }>;
  searchParams: Promise<{ category?: string; cat?: string; sort?: string; q?: string }>;
}

import type { Metadata } from "next";

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { storeType } = await params;
  const isStreetwear = storeType === "streetwear";
  const title = isStreetwear ? "Shop Streetwear" : storeType === "formal" ? "Shop Formal" : "Shop";
  const description = isStreetwear
    ? "Browse our streetwear catalog. Modern hoodies, tees, and statement pieces for urban culture."
    : storeType === "formal"
      ? "Explore our formal catalog. Bespoke trousers, blazers, and shirts for an elegant, confident look."
      : "Browse the complete VAULT catalog.";

  return {
    title: `VAULT | ${title}`,
    description,
    openGraph: {
      title: `VAULT | ${title}`,
      description,
      type: "website",
      siteName: "VAULT",
    },
    twitter: {
      card: "summary_large_image",
      title: `VAULT | ${title}`,
      description,
    },
  };
}

export default async function ShopPage({ params, searchParams }: ShopPageProps) {
  const { storeType, locale: localeParam } = await params;
  const locale = storefrontLocaleFromParam(localeParam);
  const search = await searchParams;
  const cat = search.cat;
  const q = search.q?.trim();

  const [validSlugs, storeSlugs, storeCategories] = await Promise.all([
    getValidCategorySlugs(),
    getStoreCategorySlugs(storeType),
    getStoreCategories(storeType),
  ]);

  if (storeSlugs.length === 0 && (storeType === "streetwear" || storeType === "formal")) {
    // Allow page load when categories are not seeded yet.
  } else if (storeType !== "streetwear" && storeType !== "formal") {
    notFound();
  }

  const catFilter = cat && validSlugs.includes(cat) && storeSlugs.includes(cat);

  const st = storeType as "streetwear" | "formal";
  const listingContext = {
    categorySlug: catFilter && cat ? cat : undefined,
    searchQuery: q ?? "",
  };

  const [attributeSectionsForFilters, facetProductIds, productList] = await Promise.all([
    getShopAttributeFacetsForListingContext(st, listingContext),
    getShopProductIdsForListingContext(st, listingContext),
    getShopProductsForStore(st, listingContext, locale),
  ]);

  let filterVariantSizes: string[] = [];
  let filterProductColorNames: string[] = [];
  if (facetProductIds.length > 0) {
    const [facetVariants, facetColors] = await Promise.all([
      getProductVariantsByProductIds(facetProductIds),
      getProductColorsByProductIds(facetProductIds),
    ]);
    const sizes = new Set<string>();
    for (const v of facetVariants) {
      if (v.stock > 0) sizes.add(v.size);
    }
    filterVariantSizes = [...sizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const colorNames = new Set<string>();
    for (const c of facetColors) {
      const n = typeof c.name === "string" ? c.name.trim() : "";
      if (n) colorNames.add(n);
    }
    filterProductColorNames = [...colorNames].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }

  const productIds = productList.map((p) => p.id);
  const [primarySlugByProductId, categoryFilterTags, attributeSlugsByProductId] =
    productIds.length > 0
      ? await Promise.all([
          getPrimaryCategorySlugByProductIds(productIds),
          getProductCategoryFilterTagsByProductIds(productIds),
          getProductAttributeValueSlugsByProductIds(productIds),
        ])
      : [{}, {}, {}];
  const [variantsList, colorsList] =
    productIds.length > 0
      ? await Promise.all([
          getProductVariantsByProductIds(productIds),
          getProductColorsByProductIds(productIds),
        ])
      : [[], []];

  const colorsByProductId = colorsList.reduce<Record<number, typeof productColors.$inferSelect[]>>(
    (acc, c) => {
      if (!acc[c.productId]) acc[c.productId] = [];
      acc[c.productId].push(c);
      return acc;
    },
    {},
  );

  const firstImageByProductId: Record<number, string> = {};
  for (const c of colorsList) {
    if (!firstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      firstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  const productsWithImages = productList.map((p) => ({
    ...p,
    images: firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : [],
    categorySlug: primarySlugByProductId[p.id] ?? null,
  }));

  const variantsByProductId = variantsList.reduce<Record<number, typeof productVariants.$inferSelect[]>>(
    (acc, v) => {
      if (!acc[v.productId]) acc[v.productId] = [];
      acc[v.productId].push(v);
      return acc;
    },
    {},
  );

  let shopFilterContext: "all" | "main" = "all";
  if (catFilter && cat && storeCategories.some((c) => c.slug === cat)) {
    shopFilterContext = "main";
  }

  const categoryLabel =
    catFilter && cat ? (storeCategories.find((c) => c.slug === cat)?.label ?? null) : null;

  let wishlistProductIds: number[] = [];
  const { userId } = await auth();
  if (userId) {
    const userWishlist = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    wishlistProductIds = userWishlist.map((w) => w.productId);
  }

  return (
    <div className="pt-14">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-muted border-t-foreground animate-spin rounded-full" />
          </div>
        }
      >
        <ShopClient
          products={productsWithImages}
          variantsByProductId={variantsByProductId}
          colorsByProductId={colorsByProductId}
          attributeSlugsByProductId={attributeSlugsByProductId}
          wishlistProductIds={wishlistProductIds}
          categoryLabel={categoryLabel}
          storeMainCategories={storeCategories}
          attributeSectionsForFilters={attributeSectionsForFilters}
          filterVariantSizes={filterVariantSizes}
          filterProductColorNames={filterProductColorNames}
          shopFilterContext={shopFilterContext}
          categoryFilterTags={categoryFilterTags}
          storeType={storeType}
        />
      </Suspense>
    </div>
  );
}
