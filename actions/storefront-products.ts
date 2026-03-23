"use server";

/**
 * Public, read-only product queries for the storefront.
 * Wrapped with React `cache()` so duplicate calls in the same request dedupe (RSC + generateMetadata).
 */

import { cache } from "react";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { productColors, products, productVariants } from "@/db/schema";
import { buildProductSearchWhere } from "@/lib/product-search";

export type StoreTypeFilter = "streetwear" | "formal";

/** Home “discover” strip: visible products for store + first color image via lateral join. */
export const getHomeDiscoverProductsWithFirstImage = cache(
  async (storeType: StoreTypeFilter) => {
    const firstColorSubq = db
      .select({
        firstImageUrl: sql<string>`(image_urls)[1]::text`.as("first_image_url"),
      })
      .from(productColors)
      .where(eq(productColors.productId, products.id))
      .orderBy(productColors.id)
      .limit(1)
      .as("first_color");

    return db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        salePrice: products.salePrice,
        saleStartsAt: products.saleStartsAt,
        saleEndsAt: products.saleEndsAt,
        isSaleActive: products.isSaleActive,
        category: products.category,
        categorySlug: products.categorySlug,
        color: products.color,
        isVisible: products.isVisible,
        storeType: products.storeType,
        firstImageUrl: firstColorSubq.firstImageUrl,
      })
      .from(products)
      .leftJoinLateral(firstColorSubq, sql`true`)
      .where(and(eq(products.isVisible, true), eq(products.storeType, storeType)))
      .orderBy(desc(products.id))
      .limit(8);
  },
);

export const getShopProductsForStore = cache(
  async (
    storeType: StoreTypeFilter,
    filters: { categorySlug?: string; searchQuery?: string },
  ) => {
    const baseFilters = [eq(products.isVisible, true), eq(products.storeType, storeType)];
    if (filters.categorySlug) {
      baseFilters.push(eq(products.categorySlug, filters.categorySlug));
    }
    const fts = buildProductSearchWhere(filters.searchQuery ?? "");
    if (fts) baseFilters.push(fts);
    return db.select().from(products).where(and(...baseFilters));
  },
);

function normalizeProductIds(productIds: number[]): number[] {
  return [...new Set(productIds)].sort((a, b) => a - b);
}

export const getProductVariantsByProductIds = cache(async (productIds: number[]) => {
  const ids = normalizeProductIds(productIds);
  if (ids.length === 0) return [];
  return db.select().from(productVariants).where(inArray(productVariants.productId, ids));
});

export const getProductColorsByProductIds = cache(async (productIds: number[]) => {
  const ids = normalizeProductIds(productIds);
  if (ids.length === 0) return [];
  return db.select().from(productColors).where(inArray(productColors.productId, ids));
});

export const getPublicProductTitleForMetadata = cache(async (productId: number) => {
  return db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
});

export const getPublicProductDetailForStore = cache(
  async (productId: number, storeType: StoreTypeFilter) => {
    return db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeType, storeType)))
      .limit(1);
  },
);

export const getSimilarVisibleProductsExcept = cache(
  async (
    categorySlug: string,
    storeType: StoreTypeFilter,
    excludeProductId: number,
    limit = 10,
  ) => {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isVisible, true),
          eq(products.categorySlug, categorySlug),
          eq(products.storeType, storeType),
          ne(products.id, excludeProductId),
        ),
      )
      .limit(limit);
  },
);
