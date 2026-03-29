"use server";

/**
 * Public, read-only product queries for the storefront.
 * Wrapped with React `cache()` so duplicate calls in the same request dedupe (RSC + generateMetadata).
 */

import { cache } from "react";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { categories, productColors, products, productVariants, subcategories } from "@/db/schema";
import { buildProductSearchWhere } from "@/lib/product-search";
import { isSubcategoriesTableMissingError } from "@/lib/subcategories-table";
import { conditionProductsMatchCategorySlug } from "@/lib/shop-category-filter";

export type StoreTypeFilter = "streetwear" | "formal";

const mainCat = alias(categories, "slug_main_cat");
const subRow = alias(subcategories, "slug_sub_row");

/** Breadcrumb / listing: prefer subcategory slug, else main. */
export const getPrimaryCategorySlugForProduct = cache(async (productId: number): Promise<string | null> => {
  try {
    const [row] = await db
      .select({
        subSlug: subRow.slug,
        mainSlug: mainCat.slug,
      })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .leftJoin(subRow, eq(products.subcategoryId, subRow.id))
      .where(eq(products.id, productId))
      .limit(1);
    if (!row) return null;
    return row.subSlug ?? row.mainSlug ?? null;
  } catch (e) {
    if (!isSubcategoriesTableMissingError(e)) throw e;
    const [row] = await db
      .select({ mainSlug: mainCat.slug })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .where(eq(products.id, productId))
      .limit(1);
    return row?.mainSlug ?? null;
  }
});

export const getPrimaryCategorySlugByProductIds = cache(async (productIds: number[]) => {
  const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
  if (ids.length === 0) return {} as Record<number, string>;
  try {
    const rows = await db
      .select({
        productId: products.id,
        subSlug: subRow.slug,
        mainSlug: mainCat.slug,
      })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .leftJoin(subRow, eq(products.subcategoryId, subRow.id))
      .where(inArray(products.id, ids));
    const map: Record<number, string> = {};
    for (const r of rows) {
      map[r.productId] = r.subSlug ?? r.mainSlug ?? "";
    }
    return map;
  } catch (e) {
    if (!isSubcategoriesTableMissingError(e)) throw e;
    const rows = await db
      .select({ productId: products.id, mainSlug: mainCat.slug })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .where(inArray(products.id, ids));
    const map: Record<number, string> = {};
    for (const r of rows) {
      map[r.productId] = r.mainSlug ?? "";
    }
    return map;
  }
});

export type ProductCategoryFilterTags = {
  displaySlug: string;
  mainSlug: string;
  subSlug: string | null;
};

/** For shop filter panel: primary slug, main slug, and optional sub slug per product. */
export const getProductCategoryFilterTagsByProductIds = cache(
  async (productIds: number[]): Promise<Record<number, ProductCategoryFilterTags>> => {
    const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
    if (ids.length === 0) return {};
    try {
      const rows = await db
        .select({
          productId: products.id,
          subSlug: subRow.slug,
          mainSlug: mainCat.slug,
        })
        .from(products)
        .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
        .leftJoin(subRow, eq(products.subcategoryId, subRow.id))
        .where(inArray(products.id, ids));
      const map: Record<number, ProductCategoryFilterTags> = {};
      for (const r of rows) {
        const main = r.mainSlug ?? "";
        const sub = r.subSlug ?? null;
        map[r.productId] = {
          displaySlug: sub ?? main,
          mainSlug: main,
          subSlug: sub,
        };
      }
      return map;
    } catch (e) {
      if (!isSubcategoriesTableMissingError(e)) throw e;
      const rows = await db
        .select({ productId: products.id, mainSlug: mainCat.slug })
        .from(products)
        .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
        .where(inArray(products.id, ids));
      const map: Record<number, ProductCategoryFilterTags> = {};
      for (const r of rows) {
        const main = r.mainSlug ?? "";
        map[r.productId] = { displaySlug: main, mainSlug: main, subSlug: null };
      }
      return map;
    }
  },
);

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
      firstImageUrl: firstColorSubq.firstImageUrl,
    };

    const withSubTable = () =>
      db
        .select({
          ...baseFields,
          categorySlug: sql<string | null>`COALESCE(
            (SELECT slug FROM subcategories WHERE id = ${products.subcategoryId}),
            (SELECT slug FROM categories WHERE id = ${products.mainCategoryId})
          )`.as("category_slug"),
        })
        .from(products)
        .leftJoinLateral(firstColorSubq, sql`true`)
        .where(and(eq(products.isVisible, true), eq(products.storeType, storeType)))
        .orderBy(desc(products.id))
        .limit(8);

    const mainCategorySlugOnly = () =>
      db
        .select({
          ...baseFields,
          categorySlug: sql<string | null>`(SELECT slug FROM categories WHERE id = ${products.mainCategoryId})`.as(
            "category_slug",
          ),
        })
        .from(products)
        .leftJoinLateral(firstColorSubq, sql`true`)
        .where(and(eq(products.isVisible, true), eq(products.storeType, storeType)))
        .orderBy(desc(products.id))
        .limit(8);

    try {
      return await withSubTable();
    } catch (e) {
      if (!isSubcategoriesTableMissingError(e)) throw e;
      return mainCategorySlugOnly();
    }
  },
);

export const getShopProductsForStore = cache(
  async (
    storeType: StoreTypeFilter,
    filters: { categorySlug?: string; searchQuery?: string },
  ) => {
    const baseFilters = [eq(products.isVisible, true), eq(products.storeType, storeType)];
    if (filters.categorySlug) {
      baseFilters.push(await conditionProductsMatchCategorySlug(filters.categorySlug));
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

/** Similar products: same subcategory if set, otherwise same main category. */
export const getSimilarVisibleProductsExcept = cache(
  async (forProductId: number, storeType: StoreTypeFilter, limit = 10) => {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, forProductId), eq(products.storeType, storeType)))
      .limit(1);
    if (!p) return [];
    const groupCond =
      p.subcategoryId != null
        ? eq(products.subcategoryId, p.subcategoryId)
        : eq(products.mainCategoryId, p.mainCategoryId);
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isVisible, true),
          eq(products.storeType, storeType),
          groupCond,
          ne(products.id, forProductId),
        ),
      )
      .limit(limit);
  },
);
