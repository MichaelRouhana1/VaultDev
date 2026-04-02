"use server";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { AttributeFilterSection } from "@/components/FilterPanel";
import type { ProductCategory } from "@/actions/categories";
import { getStoreCategories } from "@/lib/storefront-categories";
import type { MosaikLocale } from "@/lib/i18n-locales";
import {
  getProductAttributeValueSlugsByProductIds,
  getProductCategoryFilterTagsByProductIds,
  getProductColorsByProductIds,
  getProductVariantsByProductIds,
  getPrimaryCategorySlugByProductIds,
  getShopAttributeFacetsForListingContext,
  getShopProductIdsForListingContext,
  type ProductCategoryFilterTags,
} from "@/actions/storefront-products";
import type { SearchProductRow } from "@/actions/search";
import { db } from "@/db";
import { categories, productColors, products } from "@/db/schema";
import type { ProductColor, ProductVariant } from "@/db/schema";
import { buildProductSearchWhere, getFormattedPrefixTsquery } from "@/lib/product-search";
import { localizedProductName } from "@/lib/storefront-product-locale";

/** First paint: 10 rows × 4 cols on `md`. Subsequent pages: 6 rows × 4 cols. */
const SEARCH_INITIAL_LIMIT = 40;
const SEARCH_MORE_LIMIT = 24;

const MAX_SEARCH_PAGE = 100;

const stockExistsSql = sql<boolean>`EXISTS (
  SELECT 1 FROM product_variants v
  WHERE v.product_id = ${products.id} AND v.stock > 0
)`;

/**
 * Minimal storefront product row for search / recommendations (no `search_vector`, no descriptions in payload).
 * `slug` is the main category slug (products have no dedicated slug column; PDP uses `/product/{id}`).
 */
export type SearchProductCardRow = {
  id: number;
  name: string;
  slug: string;
  price: string;
  salePrice: string | null;
  isSaleActive: boolean;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  storeType: "streetwear" | "formal";
  mainCategoryId: number;
  images: string[];
};

function clampRecommendedLimit(limit: number): number {
  return Math.min(40, Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 40)));
}

function clampSearchPaging(limit: number, offset: number): { limit: number; offset: number } {
  return {
    limit: Math.min(MAX_SEARCH_PAGE, Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 24))),
    offset: Math.max(0, Math.floor(Number.isFinite(offset) ? offset : 0)),
  };
}

async function firstImageUrlsByProductIds(productIds: number[]): Promise<Record<number, string[]>> {
  const ids = [...new Set(productIds)].filter((id) => Number.isFinite(id));
  if (ids.length === 0) return {};

  const rows = await db
    .select({
      productId: productColors.productId,
      imageUrls: productColors.imageUrls,
    })
    .from(productColors)
    .where(inArray(productColors.productId, ids))
    .orderBy(asc(productColors.productId), asc(productColors.id));

  const map: Record<number, string[]> = {};
  for (const r of rows) {
    const url = Array.isArray(r.imageUrls) && r.imageUrls.length > 0 ? r.imageUrls[0] : null;
    if (url && map[r.productId] == null) map[r.productId] = [url];
  }
  return map;
}

function toCardRows(
  rows: {
    id: number;
    name: string;
    nameEn: string | null;
    nameFr: string | null;
    nameAr: string | null;
    price: string;
    salePrice: string | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
    isSaleActive: boolean;
    storeType: "streetwear" | "formal";
    mainCategoryId: number;
    categorySlug: string;
  }[],
  imageMap: Record<number, string[]>,
  locale: MosaikLocale,
): SearchProductCardRow[] {
  return rows.map((r) => ({
    id: r.id,
    name: localizedProductName(locale, r),
    slug: r.categorySlug,
    price: r.price,
    salePrice: r.salePrice,
    isSaleActive: r.isSaleActive,
    saleStartsAt: r.saleStartsAt,
    saleEndsAt: r.saleEndsAt,
    storeType: r.storeType,
    mainCategoryId: r.mainCategoryId,
    images: imageMap[r.id] ?? [],
  }));
}

/**
 * Fallback products when search is empty: newest in-stock visible products (fast `id` ordering).
 * Optional `locale` resolves the display `name` (defaults to English).
 */
export async function getRecommendedProducts(
  limit: number,
  locale: MosaikLocale = "en",
): Promise<SearchProductCardRow[]> {
  const lim = clampRecommendedLimit(limit);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      nameEn: products.nameEn,
      nameFr: products.nameFr,
      nameAr: products.nameAr,
      price: products.price,
      salePrice: products.salePrice,
      saleStartsAt: products.saleStartsAt,
      saleEndsAt: products.saleEndsAt,
      isSaleActive: products.isSaleActive,
      storeType: products.storeType,
      mainCategoryId: products.mainCategoryId,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.mainCategoryId, categories.id))
    .where(
      and(eq(products.isVisible, true), eq(products.isArchived, false), stockExistsSql),
    )
    .orderBy(desc(products.id))
    .limit(lim);

  const imageMap = await firstImageUrlsByProductIds(rows.map((r) => r.id));
  return toCardRows(rows, imageMap, locale);
}

/**
 * Full-text search on `products.search_vector` with total hit count and lean card rows.
 * Optional `locale` resolves the display `name` (defaults to English).
 */
export async function getSearchResults(
  query: string,
  offset: number,
  limit: number,
  locale: MosaikLocale = "en",
): Promise<{ products: SearchProductCardRow[]; totalCount: number }> {
  const q = query.trim();
  const { limit: lim, offset: off } = clampSearchPaging(limit, offset);

  const formatted = getFormattedPrefixTsquery(q);
  const fts = buildProductSearchWhere(q);
  if (!formatted || !fts) {
    return { products: [], totalCount: 0 };
  }

  const baseWhere = and(eq(products.isVisible, true), eq(products.isArchived, false), fts);

  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(baseWhere);

  const totalCount = Number(countRow?.c ?? 0);
  if (totalCount === 0) {
    return { products: [], totalCount: 0 };
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      nameEn: products.nameEn,
      nameFr: products.nameFr,
      nameAr: products.nameAr,
      price: products.price,
      salePrice: products.salePrice,
      saleStartsAt: products.saleStartsAt,
      saleEndsAt: products.saleEndsAt,
      isSaleActive: products.isSaleActive,
      storeType: products.storeType,
      mainCategoryId: products.mainCategoryId,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.mainCategoryId, categories.id))
    .where(baseWhere)
    .orderBy(
      desc(sql`ts_rank_cd(${products.searchVector}, to_tsquery('english', ${formatted}))`),
      asc(products.id),
    )
    .limit(lim)
    .offset(off);

  const imageMap = await firstImageUrlsByProductIds(rows.map((r) => r.id));
  return {
    products: toCardRows(rows, imageMap, locale),
    totalCount,
  };
}

export type SearchListingProduct = SearchProductRow & {
  images?: string[];
  categorySlug?: string | null;
  isArchived: false;
};

/** Filter panel + facet state for the search results view (from `loadSearchResultsBundle`). */
export type SearchPageFilterContext = {
  attributeSectionsForFilters: AttributeFilterSection[];
  filterVariantSizes: string[];
  filterProductColorNames: string[];
  categoryFilterTags: Record<number, ProductCategoryFilterTags>;
  attributeSlugsByProductId: Record<number, string[]>;
  storeMainCategories: ProductCategory[];
};

function cardRowToListingProduct(card: SearchProductCardRow): SearchListingProduct {
  return {
    id: card.id,
    name: card.name,
    description: null,
    price: card.price,
    salePrice: card.salePrice,
    saleStartsAt: card.saleStartsAt,
    saleEndsAt: card.saleEndsAt,
    isSaleActive: card.isSaleActive,
    color: null,
    isVisible: true,
    storeType: card.storeType,
    mainCategoryId: card.mainCategoryId,
    images: card.images,
    categorySlug: card.slug,
    isArchived: false,
  } as SearchListingProduct;
}

function mergeAttributeSections(a: AttributeFilterSection[], b: AttributeFilterSection[]): AttributeFilterSection[] {
  const byName = new Map<string, Map<string, { slug: string; label: string }>>();
  for (const sec of [...a, ...b]) {
    let values = byName.get(sec.name);
    if (!values) {
      values = new Map();
      byName.set(sec.name, values);
    }
    for (const v of sec.values) {
      const key = v.slug.trim().toLowerCase();
      if (!values.has(key)) values.set(key, v);
    }
  }
  return [...byName.entries()].map(([name, m]) => ({
    name,
    values: [...m.values()].sort((x, y) =>
      x.label.localeCompare(y.label, undefined, { sensitivity: "base" }),
    ),
  }));
}

function mergeStoreCategories(a: ProductCategory[], b: ProductCategory[]): ProductCategory[] {
  const bySlug = new Map<string, ProductCategory>();
  for (const c of [...a, ...b]) {
    if (!bySlug.has(c.slug)) bySlug.set(c.slug, c);
  }
  return [...bySlug.values()];
}

function attachImagesAndSlugs(
  productsList: SearchListingProduct[],
  colors: ProductColor[],
  slugByProductId: Record<number, string>,
): SearchListingProduct[] {
  const firstImageByProductId: Record<number, string> = {};
  for (const c of colors) {
    if (!firstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      firstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  return productsList.map((p) => ({
    ...p,
    images: firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : (p.images?.length ? p.images : []),
    categorySlug: slugByProductId[p.id] ?? p.categorySlug ?? null,
  }));
}

function variantsColorsMaps(variants: ProductVariant[], colors: ProductColor[]) {
  const variantsByProductId = variants.reduce<Record<number, ProductVariant[]>>((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push(v);
    return acc;
  }, {});
  const colorsByProductId = colors.reduce<Record<number, ProductColor[]>>((acc, c) => {
    if (!acc[c.productId]) acc[c.productId] = [];
    acc[c.productId].push(c);
    return acc;
  }, {});
  return { variantsByProductId, colorsByProductId };
}

export type SearchHydratedCardRows = {
  products: SearchListingProduct[];
  variantsByProductId: Record<number, ProductVariant[]>;
  colorsByProductId: Record<number, ProductColor[]>;
};

/** Variants / colors / slugs for `ProductCard` from lean `SearchProductCardRow[]` (recommendations or a search page). */
export async function hydrateSearchProductCardRows(
  cards: SearchProductCardRow[],
): Promise<SearchHydratedCardRows> {
  const listingProducts = cards.map(cardRowToListingProduct);
  const ids = listingProducts.map((p) => p.id);
  const [variants, colors, primarySlugByProductId] =
    ids.length > 0
      ? await Promise.all([
          getProductVariantsByProductIds(ids),
          getProductColorsByProductIds(ids),
          getPrimaryCategorySlugByProductIds(ids),
        ])
      : [[], [], {} as Record<number, string>];
  const { variantsByProductId, colorsByProductId } = variantsColorsMaps(variants, colors);
  const productsOut = attachImagesAndSlugs(listingProducts, colors, primarySlugByProductId);
  return { products: productsOut, variantsByProductId, colorsByProductId };
}

export async function loadSearchRecommendations(locale: MosaikLocale): Promise<SearchHydratedCardRows> {
  const cards = await getRecommendedProducts(40, locale);
  return hydrateSearchProductCardRows(cards);
}

/** First parallel wave for search filter metadata (runs alongside {@link getSearchResults}). */
export type SearchFilterWave1 = {
  facetsSt: AttributeFilterSection[];
  facetsFo: AttributeFilterSection[];
  idsSt: number[];
  idsFo: number[];
  catsSt: ProductCategory[];
  catsFo: ProductCategory[];
};

export async function loadSearchFilterWave1(query: string): Promise<SearchFilterWave1> {
  const q = query.trim();
  if (!q) {
    return {
      facetsSt: [],
      facetsFo: [],
      idsSt: [],
      idsFo: [],
      catsSt: [],
      catsFo: [],
    };
  }
  const [facetsSt, facetsFo, idsSt, idsFo, catsSt, catsFo] = await Promise.all([
    getShopAttributeFacetsForListingContext("streetwear", { searchQuery: q }),
    getShopAttributeFacetsForListingContext("formal", { searchQuery: q }),
    getShopProductIdsForListingContext("streetwear", { searchQuery: q }),
    getShopProductIdsForListingContext("formal", { searchQuery: q }),
    getStoreCategories("streetwear"),
    getStoreCategories("formal"),
  ]);
  return { facetsSt, facetsFo, idsSt, idsFo, catsSt, catsFo };
}

const EMPTY_SEARCH_PAGE_FILTER_CONTEXT: SearchPageFilterContext = {
  attributeSectionsForFilters: [],
  filterVariantSizes: [],
  filterProductColorNames: [],
  categoryFilterTags: {},
  attributeSlugsByProductId: {},
  storeMainCategories: [],
};

/** Completes {@link SearchPageFilterContext} after {@link loadSearchFilterWave1} + known result product ids. */
export async function buildSearchPageFilterContext(
  query: string,
  loadedProductIds: number[],
  wave1: SearchFilterWave1,
): Promise<SearchPageFilterContext> {
  const q = query.trim();
  if (!q) return { ...EMPTY_SEARCH_PAGE_FILTER_CONTEXT };

  const { facetsSt, facetsFo, idsSt, idsFo, catsSt, catsFo } = wave1;
  const loadedIds = [...new Set(loadedProductIds.filter((id) => Number.isFinite(id)))];
  const facetIds = [...new Set([...idsSt, ...idsFo])];

  const [facetVariants, facetColors, tags, attrSlugs] = await Promise.all([
    facetIds.length > 0 ? getProductVariantsByProductIds(facetIds) : Promise.resolve([] as ProductVariant[]),
    facetIds.length > 0 ? getProductColorsByProductIds(facetIds) : Promise.resolve([] as ProductColor[]),
    loadedIds.length > 0
      ? getProductCategoryFilterTagsByProductIds(loadedIds)
      : Promise.resolve({} as Record<number, ProductCategoryFilterTags>),
    loadedIds.length > 0
      ? getProductAttributeValueSlugsByProductIds(loadedIds)
      : Promise.resolve({} as Record<number, string[]>),
  ]);

  const mergedFacets = mergeAttributeSections(facetsSt, facetsFo);
  const mergedCats = mergeStoreCategories(catsSt, catsFo);

  const sizes = new Set<string>();
  for (const v of facetVariants) {
    if (v.stock > 0) sizes.add(v.size);
  }
  const filterVariantSizes = [...sizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const colorNames = new Set<string>();
  for (const c of facetColors) {
    const n = typeof c.name === "string" ? c.name.trim() : "";
    if (n) colorNames.add(n);
  }
  const filterProductColorNames = [...colorNames].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return {
    attributeSectionsForFilters: mergedFacets,
    filterVariantSizes,
    filterProductColorNames,
    categoryFilterTags: tags,
    attributeSlugsByProductId: attrSlugs,
    storeMainCategories: mergedCats,
  };
}

type SearchResultsPayload = {
  products: SearchListingProduct[];
  totalCount: number;
  variantsByProductId: Record<number, ProductVariant[]>;
  colorsByProductId: Record<number, ProductColor[]>;
  attributeSectionsForFilters: AttributeFilterSection[];
  filterVariantSizes: string[];
  filterProductColorNames: string[];
  categoryFilterTags: Record<number, ProductCategoryFilterTags>;
  attributeSlugsByProductId: Record<number, string[]>;
  storeMainCategories: ProductCategory[];
};

export async function loadSearchResultsBundle(
  query: string,
  locale: MosaikLocale,
): Promise<SearchResultsPayload> {
  const q = query.trim();
  if (!q) {
    return {
      products: [],
      totalCount: 0,
      variantsByProductId: {},
      colorsByProductId: {},
      ...EMPTY_SEARCH_PAGE_FILTER_CONTEXT,
    };
  }

  const [searchPage, wave1] = await Promise.all([
    getSearchResults(q, 0, SEARCH_INITIAL_LIMIT, locale),
    loadSearchFilterWave1(q),
  ]);

  const loadedIds = searchPage.products.map((c) => c.id);

  const [hydrated, filterCtx] = await Promise.all([
    hydrateSearchProductCardRows(searchPage.products),
    buildSearchPageFilterContext(q, loadedIds, wave1),
  ]);

  return {
    products: hydrated.products,
    totalCount: searchPage.totalCount,
    variantsByProductId: hydrated.variantsByProductId,
    colorsByProductId: hydrated.colorsByProductId,
    ...filterCtx,
  };
}

/**
 * Next slice for infinite scroll (`offset` = current loaded product count).
 * Internally uses {@link getSearchResults} (24 rows) then hydrates variants/colors for `ProductCard`.
 */
export async function loadSearchResultsMore(
  query: string,
  locale: MosaikLocale,
  offset: number,
): Promise<{
  products: SearchListingProduct[];
  variantsByProductId: Record<number, ProductVariant[]>;
  colorsByProductId: Record<number, ProductColor[]>;
  categoryFilterTags: Record<number, ProductCategoryFilterTags>;
  attributeSlugsByProductId: Record<number, string[]>;
}> {
  const q = query.trim();
  if (!q) {
    return {
      products: [],
      variantsByProductId: {},
      colorsByProductId: {},
      categoryFilterTags: {},
      attributeSlugsByProductId: {},
    };
  }

  const searchPage = await getSearchResults(q, offset, SEARCH_MORE_LIMIT, locale);
  const listingProducts = searchPage.products.map(cardRowToListingProduct);
  const loadedIds = listingProducts.map((p) => p.id);
  if (loadedIds.length === 0) {
    return {
      products: [],
      variantsByProductId: {},
      colorsByProductId: {},
      categoryFilterTags: {},
      attributeSlugsByProductId: {},
    };
  }

  const [primarySlugByProductId, tags, attrSlugs, variants, colors] = await Promise.all([
    getPrimaryCategorySlugByProductIds(loadedIds),
    getProductCategoryFilterTagsByProductIds(loadedIds),
    getProductAttributeValueSlugsByProductIds(loadedIds),
    getProductVariantsByProductIds(loadedIds),
    getProductColorsByProductIds(loadedIds),
  ]);

  const { variantsByProductId, colorsByProductId } = variantsColorsMaps(variants, colors);
  const products = attachImagesAndSlugs(listingProducts, colors, primarySlugByProductId);

  return {
    products,
    variantsByProductId,
    colorsByProductId,
    categoryFilterTags: tags,
    attributeSlugsByProductId: attrSlugs,
  };
}
