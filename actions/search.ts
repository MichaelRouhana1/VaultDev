"use server";

import { cache } from "react";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import type { ProductColor, ProductVariant } from "@/db/schema";
import { buildProductSearchWhere, getFormattedPrefixTsquery } from "@/lib/product-search";
import { conditionProductsMatchCategorySlug } from "@/lib/shop-category-filter";
import { getProductColorsByProductIds, getProductVariantsByProductIds, type StoreTypeFilter } from "@/actions/storefront-products";
import { listingProductColumns } from "@/lib/storefront-listing-columns";
import { withLocalizedProductCopy } from "@/lib/storefront-product-locale";
import type { MosaikLocale } from "@/lib/i18n-locales";

export type SearchResultsFilters = {
  storeType?: StoreTypeFilter;
  categorySlug?: string;
};

type ListingSelectRow = {
  id: number;
  name: string;
  nameEn: string | null;
  nameFr: string | null;
  nameAr: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  price: string;
  salePrice: string | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  isSaleActive: boolean;
  color: string | null;
  isVisible: boolean;
  storeType: "streetwear" | "formal";
  mainCategoryId: number;
};

export type SearchProductRow = ReturnType<typeof withLocalizedProductCopy<ListingSelectRow>>;

const stockExistsSql = sql<boolean>`EXISTS (
  SELECT 1 FROM product_variants v
  WHERE v.product_id = ${products.id} AND v.stock > 0
)`;

function clampLimitOffset(limit: number, offset: number): { limit: number; offset: number } {
  const lim = Number.isFinite(limit) ? Math.floor(limit) : 24;
  const off = Number.isFinite(offset) ? Math.floor(offset) : 0;
  return {
    limit: Math.min(100, Math.max(1, lim)),
    offset: Math.max(0, Math.min(off, 1_000_000)),
  };
}

async function hydrateListingRows(
  rows: ListingSelectRow[],
  locale: MosaikLocale,
): Promise<{
  products: SearchProductRow[];
  variants: ProductVariant[];
  colors: ProductColor[];
}> {
  const localized = rows.map((row) => withLocalizedProductCopy(row, locale));
  const ids = localized.map((p) => p.id);
  if (ids.length === 0) {
    return { products: localized, variants: [], colors: [] };
  }
  const [variants, colors] = await Promise.all([
    getProductVariantsByProductIds(ids),
    getProductColorsByProductIds(ids),
  ]);
  return { products: localized, variants, colors };
}

/**
 * Up to 40 visible, in-stock products for the empty-search state (random order).
 * No `featured` column in schema — uses `ORDER BY random()` among eligible rows.
 */
export const getRecommendedSearchProducts = cache(
  async (
    locale: MosaikLocale,
    options?: { storeType?: StoreTypeFilter },
  ): Promise<{
    products: SearchProductRow[];
    variants: ProductVariant[];
    colors: ProductColor[];
  }> => {
    const store = options?.storeType;

    const base = [
      eq(products.isVisible, true),
      eq(products.isArchived, false),
      stockExistsSql,
    ];
    if (store) {
      base.push(eq(products.storeType, store));
    }

    const rows = await db
      .select(listingProductColumns)
      .from(products)
      .where(and(...base))
      .orderBy(sql`random()`)
      .limit(40);

    return hydrateListingRows(rows as ListingSelectRow[], locale);
  },
);

/**
 * Full-text search with total count + paginated product rows (minimal columns).
 * Returns variants/colors for the current page only (ProductCard hydration).
 */
export async function getPaginatedSearchResults(input: {
  query: string;
  limit: number;
  offset: number;
  locale: MosaikLocale;
  filters?: SearchResultsFilters;
}): Promise<{
  products: SearchProductRow[];
  totalCount: number;
  variants: ProductVariant[];
  colors: ProductColor[];
}> {
  const { query, locale, filters } = input;
  const { limit: lim, offset: off } = clampLimitOffset(input.limit, input.offset);

  const formatted = getFormattedPrefixTsquery(query.trim());
  const fts = buildProductSearchWhere(query);
  if (!formatted || !fts) {
    return { products: [], totalCount: 0, variants: [], colors: [] };
  }

  const parts = [eq(products.isVisible, true), eq(products.isArchived, false), fts];

  if (filters?.storeType) {
    parts.push(eq(products.storeType, filters.storeType));
  }
  if (filters?.categorySlug?.trim()) {
    parts.push(await conditionProductsMatchCategorySlug(filters.categorySlug.trim()));
  }

  const whereClause = and(...parts);

  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause);

  const totalCount = Number(countRow?.c ?? 0);
  if (totalCount === 0) {
    return { products: [], totalCount: 0, variants: [], colors: [] };
  }

  const rows = await db
    .select(listingProductColumns)
    .from(products)
    .where(whereClause)
    .orderBy(
      desc(sql`ts_rank_cd(${products.searchVector}, to_tsquery('english', ${formatted}))`),
      asc(products.id),
    )
    .limit(lim)
    .offset(off);

  const hydrated = await hydrateListingRows(rows as ListingSelectRow[], locale);
  return { ...hydrated, totalCount };
}
