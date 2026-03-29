"use server";

/**
 * Public, read-only product queries for the storefront.
 * Wrapped with React `cache()` so duplicate calls in the same request dedupe (RSC + generateMetadata).
 */

import { cache } from "react";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  productAttributeValues,
  productColors,
  products,
  productVariants,
  attributeValues,
} from "@/db/schema";
import { buildProductSearchWhere } from "@/lib/product-search";
import { conditionProductsMatchCategorySlug } from "@/lib/shop-category-filter";
import { resolveAttributeSlugsToIds } from "@/actions/attributes";

export type StoreTypeFilter = "streetwear" | "formal";

const mainCat = alias(categories, "slug_main_cat");

/** Listing / metadata: main category slug for the product. */
export const getPrimaryCategorySlugForProduct = cache(async (productId: number): Promise<string | null> => {
  const [row] = await db
    .select({ mainSlug: mainCat.slug })
    .from(products)
    .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
    .where(and(eq(products.id, productId), eq(products.isArchived, false)))
    .limit(1);
  return row?.mainSlug ?? null;
});

export const getPrimaryCategorySlugByProductIds = cache(async (productIds: number[]) => {
  const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
  if (ids.length === 0) return {} as Record<number, string>;
  const rows = await db
    .select({
      productId: products.id,
      mainSlug: mainCat.slug,
    })
    .from(products)
    .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
    .where(and(inArray(products.id, ids), eq(products.isArchived, false)));
  const map: Record<number, string> = {};
  for (const r of rows) {
    map[r.productId] = r.mainSlug ?? "";
  }
  return map;
});

export type ProductCategoryFilterTags = {
  displaySlug: string;
  mainSlug: string;
};

/** For shop filter panel: main category slug per product (client-side main-category chips). */
export const getProductCategoryFilterTagsByProductIds = cache(
  async (productIds: number[]): Promise<Record<number, ProductCategoryFilterTags>> => {
    const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
    if (ids.length === 0) return {};
    const rows = await db
      .select({
        productId: products.id,
        mainSlug: mainCat.slug,
      })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .where(and(inArray(products.id, ids), eq(products.isArchived, false)));
    const map: Record<number, ProductCategoryFilterTags> = {};
    for (const r of rows) {
      const main = r.mainSlug ?? "";
      map[r.productId] = { displaySlug: main, mainSlug: main };
    }
    return map;
  },
);

/** Slugs of attribute values linked to each product (client-side optional use). */
export const getProductAttributeValueSlugsByProductIds = cache(
  async (productIds: number[]): Promise<Record<number, string[]>> => {
    const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
    if (ids.length === 0) return {};
    const rows = await db
      .select({
        productId: productAttributeValues.productId,
        slug: attributeValues.slug,
      })
      .from(productAttributeValues)
      .innerJoin(attributeValues, eq(productAttributeValues.attributeValueId, attributeValues.id))
      .where(inArray(productAttributeValues.productId, ids));
    const map: Record<number, string[]> = {};
    for (const r of rows) {
      if (!map[r.productId]) map[r.productId] = [];
      map[r.productId].push(r.slug);
    }
    return map;
  },
);

/** Home “discover” strip: visible products for store + first color image via correlated subqueries. */
export const getHomeDiscoverProductsWithFirstImage = cache(async (storeType: StoreTypeFilter) => {
  const baseFields = {
    id: products.id,
    name: products.name,
    description: products.description,
    price: products.price,
    salePrice: products.salePrice,
    saleStartsAt: products.saleStartsAt,
    saleEndsAt: products.saleEndsAt,
    isSaleActive: products.isSaleActive,
    color: products.color,
    isVisible: products.isVisible,
    storeType: products.storeType,
  };

  return db
    .select({
      ...baseFields,
      firstImageUrl: sql<string | null>`(
        SELECT ${productColors.imageUrls}[1]
        FROM ${productColors}
        WHERE ${productColors.productId} = ${products.id}
        ORDER BY ${productColors.id} ASC
        LIMIT 1
      )`.as("first_image_url"),
      categorySlug: sql<string | null>`(
        SELECT ${categories.slug}
        FROM ${categories}
        WHERE ${categories.id} = ${products.mainCategoryId}
      )`.as("category_slug"),
    })
    .from(products)
    .where(
      and(eq(products.isVisible, true), eq(products.isArchived, false), eq(products.storeType, storeType)),
    )
    .orderBy(desc(products.id))
    .limit(8);
});

export const getShopProductsForStore = cache(
  async (
    storeType: StoreTypeFilter,
    filters: { categorySlug?: string; searchQuery?: string; attributeSlugs?: string[] },
  ) => {
    const baseFilters = [
      eq(products.isVisible, true),
      eq(products.isArchived, false),
      eq(products.storeType, storeType),
    ];
    if (filters.categorySlug) {
      baseFilters.push(await conditionProductsMatchCategorySlug(filters.categorySlug));
    }
    const fts = buildProductSearchWhere(filters.searchQuery ?? "");
    if (fts) baseFilters.push(fts);

    const slugs = filters.attributeSlugs?.filter(Boolean) ?? [];
    if (slugs.length > 0) {
      const valueIds = await resolveAttributeSlugsToIds(slugs);
      for (const vid of valueIds) {
        baseFilters.push(
          sql`EXISTS (
            SELECT 1 FROM ${productAttributeValues}
            WHERE ${productAttributeValues.productId} = ${products.id}
            AND ${productAttributeValues.attributeValueId} = ${vid}
          )`,
        );
      }
    }

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
    .where(and(eq(products.id, productId), eq(products.isArchived, false)))
    .limit(1);
});

export const getPublicProductDetailForStore = cache(
  async (productId: number, storeType: StoreTypeFilter) => {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.storeType, storeType),
          eq(products.isArchived, false),
        ),
      )
      .limit(1);
  },
);

/** Similar products: share at least one attribute value, else same main category. */
export const getSimilarVisibleProductsExcept = cache(
  async (forProductId: number, storeType: StoreTypeFilter, limit = 10) => {
    const [p] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, forProductId),
          eq(products.storeType, storeType),
          eq(products.isArchived, false),
        ),
      )
      .limit(1);
    if (!p) return [];

    const links = await db
      .select({ attributeValueId: productAttributeValues.attributeValueId })
      .from(productAttributeValues)
      .where(eq(productAttributeValues.productId, forProductId));
    const valueIds = links.map((l) => l.attributeValueId);

    if (valueIds.length > 0) {
      const candidateRows = await db
        .select({ productId: productAttributeValues.productId })
        .from(productAttributeValues)
        .where(
          and(
            inArray(productAttributeValues.attributeValueId, valueIds),
            ne(productAttributeValues.productId, forProductId),
          ),
        );
      const idList = [...new Set(candidateRows.map((r) => r.productId))].slice(0, limit);
      if (idList.length > 0) {
        return db
          .select()
          .from(products)
          .where(
            and(
              eq(products.isVisible, true),
              eq(products.isArchived, false),
              eq(products.storeType, storeType),
              inArray(products.id, idList),
              ne(products.id, forProductId),
            ),
          )
          .limit(limit);
      }
    }

    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isVisible, true),
          eq(products.isArchived, false),
          eq(products.storeType, storeType),
          eq(products.mainCategoryId, p.mainCategoryId),
          ne(products.id, forProductId),
        ),
      )
      .limit(limit);
  },
);
