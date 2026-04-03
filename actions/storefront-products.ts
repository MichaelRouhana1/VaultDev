"use server";

/**
 * Public, read-only product queries for the storefront.
 * Wrapped with React `cache()` so duplicate calls in the same request dedupe (RSC + generateMetadata).
 */

import { cache } from "react";
import { and, asc, desc, eq, inArray, ne, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  attributes,
  attributeValues,
  categories,
  productAttributeValues,
  productColors,
  products,
  productVariants,
} from "@/db/schema";
import type { MosaikLocale } from "@/lib/i18n-locales";
import {
  localizedProductName,
  withLocalizedProductCopy,
} from "@/lib/storefront-product-locale";
import { buildProductSearchWhere } from "@/lib/product-search";
import { listingProductColumns } from "@/lib/storefront-listing-columns";
import { conditionProductsMatchCategorySlug } from "@/lib/shop-category-filter";
import { withDbRetry } from "@/lib/utils";
export type StoreTypeFilter = "streetwear" | "formal";

/** Coerce DB text for UI (same idea as `actions/attributes`). */
function toUiString(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

export type ShopAttributeFilterSection = {
  name: string;
  values: { slug: string; label: string }[];
};

const mainCat = alias(categories, "slug_main_cat");

/** Visible products for a store listing: store + optional main category + optional search (no attribute slugs). */
async function shopListingFilterSql(
  storeType: StoreTypeFilter,
  filters: { categorySlug?: string; searchQuery?: string },
): Promise<SQL[]> {
  const parts: SQL[] = [
    eq(products.isVisible, true),
    eq(products.isArchived, false),
    eq(products.storeType, storeType),
  ];
  if (filters.categorySlug) {
    parts.push(await conditionProductsMatchCategorySlug(filters.categorySlug));
  }
  const fts = buildProductSearchWhere(filters.searchQuery ?? "");
  if (fts) parts.push(fts);
  return parts;
}

/** Listing / metadata: main category slug for the product. */
export const getPrimaryCategorySlugForProduct = cache(async (productId: number): Promise<string | null> => {
  const [row] = await withDbRetry(() =>
    db
      .select({ mainSlug: mainCat.slug })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .where(and(eq(products.id, productId), eq(products.isArchived, false)))
      .limit(1),
  );
  return row?.mainSlug ?? null;
});

export const getPrimaryCategorySlugByProductIds = cache(async (productIds: number[]) => {
  const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
  if (ids.length === 0) return {} as Record<number, string>;
  const rows = await withDbRetry(() =>
    db
      .select({
        productId: products.id,
        mainSlug: mainCat.slug,
      })
      .from(products)
      .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
      .where(and(inArray(products.id, ids), eq(products.isArchived, false))),
  );
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
    const rows = await withDbRetry(() =>
      db
        .select({
          productId: products.id,
          mainSlug: mainCat.slug,
        })
        .from(products)
        .innerJoin(mainCat, eq(products.mainCategoryId, mainCat.id))
        .where(and(inArray(products.id, ids), eq(products.isArchived, false))),
    );
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
    const rows = await withDbRetry(() =>
      db
        .select({
          productId: productAttributeValues.productId,
          slug: attributeValues.slug,
        })
        .from(productAttributeValues)
        .innerJoin(attributeValues, eq(productAttributeValues.attributeValueId, attributeValues.id))
        .where(inArray(productAttributeValues.productId, ids)),
    );
    const map: Record<number, string[]> = {};
    for (const r of rows) {
      if (!map[r.productId]) map[r.productId] = [];
      map[r.productId].push(r.slug);
    }
    return map;
  },
);

function rethrowDbWithPgMessage(e: unknown): never {
  if (process.env.NODE_ENV === "development" && e && typeof e === "object") {
    const err = e as Error & { cause?: unknown };
    const c = err.cause;
    const pg =
      c instanceof Error
        ? c.message
        : c && typeof c === "object" && "message" in c
          ? String((c as { message: unknown }).message)
          : undefined;
    if (pg) {
      throw new Error(`${err.message}\n\nPostgreSQL: ${pg}`, { cause: err });
    }
  }
  throw e;
}

/** Home “discover” strip: visible products for store + first color image + main category slug. */
export const getHomeDiscoverProductsWithFirstImage = cache(
  async (storeType: StoreTypeFilter, locale: MosaikLocale) => {
    const productRows = await withDbRetry(() =>
      db
        .select(listingProductColumns)
        .from(products)
        .where(
          and(eq(products.isVisible, true), eq(products.isArchived, false), eq(products.storeType, storeType)),
        )
        .orderBy(desc(products.id))
        .limit(8)
        .catch((e: unknown) => {
          rethrowDbWithPgMessage(e);
        }),
    );

    const localizedRows = productRows.map((row) => withLocalizedProductCopy(row, locale));

    const ids = localizedRows.map((r) => r.id);
    if (ids.length === 0) return [];

    const categoryIds = [...new Set(localizedRows.map((r) => r.mainCategoryId))];
    const slugByCategoryId = new Map<number, string>();
    if (categoryIds.length > 0) {
      const catRows = await withDbRetry(() =>
        db
          .select({ id: categories.id, slug: categories.slug })
          .from(categories)
          .where(inArray(categories.id, categoryIds))
          .catch((e: unknown) => {
            rethrowDbWithPgMessage(e);
          }),
      );
      for (const c of catRows) {
        if (c.slug != null) slugByCategoryId.set(c.id, c.slug);
      }
    }

    const colorRows = await withDbRetry(() =>
      db
        .select({
          productId: productColors.productId,
          imageUrls: productColors.imageUrls,
        })
        .from(productColors)
        .where(inArray(productColors.productId, ids))
        .orderBy(asc(productColors.productId), asc(productColors.id))
        .catch((e: unknown) => {
          rethrowDbWithPgMessage(e);
        }),
    );

    const firstImageByProductId = new Map<number, string | null>();
    for (const row of colorRows) {
      if (firstImageByProductId.has(row.productId)) continue;
      const urls = row.imageUrls;
      const first = Array.isArray(urls) && urls.length > 0 ? (urls[0] ?? null) : null;
      firstImageByProductId.set(row.productId, first);
    }

    return localizedRows.map(({ mainCategoryId, ...rest }) => ({
      ...rest,
      categorySlug: slugByCategoryId.get(mainCategoryId) ?? null,
      firstImageUrl: firstImageByProductId.get(rest.id) ?? null,
    }));
  },
);

export type ShopListingPriceSort = "price-asc" | "price-desc";

/** Shop grid: store + optional category + optional search. Attribute facets filter on the client. */
export const getShopProductsForStore = cache(
  async (
    storeType: StoreTypeFilter,
    filters: { categorySlug?: string; searchQuery?: string },
    locale: MosaikLocale,
    options?: { priceSort?: ShopListingPriceSort },
  ) => {
    const baseFilters = await shopListingFilterSql(storeType, {
      categorySlug: filters.categorySlug,
      searchQuery: filters.searchQuery,
    });
    const base = db
      .select({
        ...listingProductColumns,
        isArchived: products.isArchived,
      })
      .from(products)
      .where(and(...baseFilters));
    const rows = await withDbRetry(() =>
      options?.priceSort === "price-desc"
        ? base.orderBy(desc(products.price), asc(products.id))
        : base.orderBy(asc(products.price), asc(products.id)),
    );
    return rows.map((row) => withLocalizedProductCopy(row, locale));
  },
);

/** Product IDs matching the same listing context as the shop grid, before `?attributes=` refinements. */
export const getShopProductIdsForListingContext = cache(
  async (
    storeType: StoreTypeFilter,
    filters: { categorySlug?: string; searchQuery?: string },
  ): Promise<number[]> => {
    const parts = await shopListingFilterSql(storeType, filters);
    const rows = await withDbRetry(() => db.select({ id: products.id }).from(products).where(and(...parts)));
    return rows.map((r) => r.id);
  },
);

/**
 * Attribute groups / values that appear on at least one product in the listing context
 * (store + optional category + optional search). Excludes `?attributes=` so the facet list
 * stays stable while refining.
 */
export const getShopAttributeFacetsForListingContext = cache(
  async (
    storeType: StoreTypeFilter,
    filters: { categorySlug?: string; searchQuery?: string },
  ): Promise<ShopAttributeFilterSection[]> => {
    const parts = await shopListingFilterSql(storeType, filters);
    const rows = await withDbRetry(() =>
      db
        .select({
          attrId: attributes.id,
          attrName: attributes.name,
          attrSort: attributes.sortOrder,
          valId: attributeValues.id,
          valName: attributeValues.name,
          valSlug: attributeValues.slug,
        })
        .from(products)
        .innerJoin(productAttributeValues, eq(productAttributeValues.productId, products.id))
        .innerJoin(attributeValues, eq(attributeValues.id, productAttributeValues.attributeValueId))
        .innerJoin(attributes, eq(attributes.id, attributeValues.attributeId))
        .where(and(...parts)),
    );

    type AttrAgg = {
      sortOrder: number;
      name: string;
      values: Map<number, { slug: string; label: string }>;
    };
    const byAttrId = new Map<number, AttrAgg>();
    for (const r of rows) {
      let agg = byAttrId.get(r.attrId);
      if (!agg) {
        agg = {
          sortOrder: r.attrSort ?? 0,
          name: toUiString(r.attrName),
          values: new Map(),
        };
        byAttrId.set(r.attrId, agg);
      }
      if (!agg.values.has(r.valId)) {
        agg.values.set(r.valId, {
          slug: toUiString(r.valSlug),
          label: toUiString(r.valName),
        });
      }
    }

    const sections = [...byAttrId.entries()]
      .map(([, agg]) => ({
        sortOrder: agg.sortOrder,
        name: agg.name.toUpperCase(),
        values: [...agg.values.values()].sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
        ),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    return sections.map(({ name, values }) => ({ name, values }));
  },
);

function normalizeProductIds(productIds: number[]): number[] {
  return [...new Set(productIds)].sort((a, b) => a - b);
}

export const getProductVariantsByProductIds = cache(async (productIds: number[]) => {
  const ids = normalizeProductIds(productIds);
  if (ids.length === 0) return [];
  return withDbRetry(() => db.select().from(productVariants).where(inArray(productVariants.productId, ids)));
});

export const getProductColorsByProductIds = cache(async (productIds: number[]) => {
  const ids = normalizeProductIds(productIds);
  if (ids.length === 0) return [];
  return withDbRetry(() => db.select().from(productColors).where(inArray(productColors.productId, ids)));
});

export const getPublicProductTitleForMetadata = cache(async (productId: number, locale: MosaikLocale) => {
  const rows = await withDbRetry(() =>
    db
      .select({
        name: products.name,
        nameEn: products.nameEn,
        nameFr: products.nameFr,
        nameAr: products.nameAr,
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isArchived, false)))
      .limit(1),
  );
  const row = rows[0];
  if (!row) return [];
  return [{ name: localizedProductName(locale, row) }];
});

export const getPublicProductDetailForStore = cache(
  async (productId: number, storeType: StoreTypeFilter, locale: MosaikLocale) => {
    const rows = await withDbRetry(() =>
      db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.storeType, storeType),
            eq(products.isArchived, false),
          ),
        )
        .limit(1),
    );
    const row = rows[0];
    if (!row) return [];
    return [withLocalizedProductCopy(row, locale)];
  },
);

/** Similar products: same main shop category (ignores attribute tags so e.g. different fits still match). */
export const getSimilarVisibleProductsExcept = cache(
  async (forProductId: number, storeType: StoreTypeFilter, locale: MosaikLocale, limit = 10) => {
    const [p] = await withDbRetry(() =>
      db
        .select({ mainCategoryId: products.mainCategoryId })
        .from(products)
        .where(
          and(
            eq(products.id, forProductId),
            eq(products.storeType, storeType),
            eq(products.isArchived, false),
          ),
        )
        .limit(1),
    );
    if (!p) return [];

    const rows = await withDbRetry(() =>
      db
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
        .orderBy(desc(products.id))
        .limit(limit),
    );
    return rows.map((row) => withLocalizedProductCopy(row, locale));
  },
);
