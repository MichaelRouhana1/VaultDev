"use server";

import type { AttributeFilterSection } from "@/components/FilterPanel";
import type { ProductCategory } from "@/actions/categories";
import { getStoreCategories } from "@/actions/categories";
import type { MosaikLocale } from "@/lib/i18n-locales";
import { getPaginatedSearchResults, getRecommendedSearchProducts, type SearchProductRow } from "@/actions/search";
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
import type { ProductColor, ProductVariant } from "@/db/schema";

/** First paint: 10 rows × 4 cols on `md`. Subsequent pages: 6 rows × 4 cols. */
const SEARCH_INITIAL_LIMIT = 40;
const SEARCH_MORE_LIMIT = 24;

type SearchListingProduct = SearchProductRow & {
  images?: string[];
  categorySlug?: string | null;
  isArchived: false;
};

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
  products: SearchProductRow[],
  colors: ProductColor[],
  slugByProductId: Record<number, string>,
): SearchListingProduct[] {
  const firstImageByProductId: Record<number, string> = {};
  for (const c of colors) {
    if (!firstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      firstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  return products.map((p) => ({
    ...p,
    isArchived: false as const,
    images: firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : [],
    categorySlug: slugByProductId[p.id] ?? null,
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

type SearchRecommendationsPayload = {
  products: SearchListingProduct[];
  variantsByProductId: Record<number, ProductVariant[]>;
  colorsByProductId: Record<number, ProductColor[]>;
};

export async function loadSearchRecommendations(locale: MosaikLocale): Promise<SearchRecommendationsPayload> {
  const bundle = await getRecommendedSearchProducts(locale);
  const ids = bundle.products.map((p) => p.id);
  const primarySlugByProductId =
    ids.length > 0 ? await getPrimaryCategorySlugByProductIds(ids) : ({} as Record<number, string>);
  const { variantsByProductId, colorsByProductId } = variantsColorsMaps(bundle.variants, bundle.colors);
  const products = attachImagesAndSlugs(bundle.products, bundle.colors, primarySlugByProductId);
  return { products, variantsByProductId, colorsByProductId };
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
      attributeSectionsForFilters: [],
      filterVariantSizes: [],
      filterProductColorNames: [],
      categoryFilterTags: {},
      attributeSlugsByProductId: {},
      storeMainCategories: [],
    };
  }

  const [page, facetsSt, facetsFo, idsSt, idsFo, catsSt, catsFo] = await Promise.all([
    getPaginatedSearchResults({ query: q, limit: SEARCH_INITIAL_LIMIT, offset: 0, locale }),
    getShopAttributeFacetsForListingContext("streetwear", { searchQuery: q }),
    getShopAttributeFacetsForListingContext("formal", { searchQuery: q }),
    getShopProductIdsForListingContext("streetwear", { searchQuery: q }),
    getShopProductIdsForListingContext("formal", { searchQuery: q }),
    getStoreCategories("streetwear"),
    getStoreCategories("formal"),
  ]);

  const loadedIds = page.products.map((p) => p.id);
  const facetIds = [...new Set([...idsSt, ...idsFo])];

  const [facetVariants, facetColors, primarySlugByProductId, tags, attrSlugs] = await Promise.all([
    facetIds.length > 0 ? getProductVariantsByProductIds(facetIds) : Promise.resolve([] as ProductVariant[]),
    facetIds.length > 0 ? getProductColorsByProductIds(facetIds) : Promise.resolve([] as ProductColor[]),
    loadedIds.length > 0 ? getPrimaryCategorySlugByProductIds(loadedIds) : Promise.resolve({} as Record<number, string>),
    loadedIds.length > 0
      ? getProductCategoryFilterTagsByProductIds(loadedIds)
      : Promise.resolve({} as Record<number, ProductCategoryFilterTags>),
    loadedIds.length > 0
      ? getProductAttributeValueSlugsByProductIds(loadedIds)
      : Promise.resolve({} as Record<number, string[]>),
  ]);

  const mergedFacets = mergeAttributeSections(facetsSt, facetsFo);
  const mergedCats = mergeStoreCategories(catsSt, catsFo);
  const { variantsByProductId, colorsByProductId } = variantsColorsMaps(page.variants, page.colors);
  const products = attachImagesAndSlugs(page.products, page.colors, primarySlugByProductId);

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
    products,
    totalCount: page.totalCount,
    variantsByProductId,
    colorsByProductId,
    attributeSectionsForFilters: mergedFacets,
    filterVariantSizes,
    filterProductColorNames,
    categoryFilterTags: tags,
    attributeSlugsByProductId: attrSlugs,
    storeMainCategories: mergedCats,
  };
}

/** Next slice for infinite scroll (offset = current loaded count). */
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

  const page = await getPaginatedSearchResults({
    query: q,
    limit: SEARCH_MORE_LIMIT,
    offset,
    locale,
  });

  const loadedIds = page.products.map((p) => p.id);
  if (loadedIds.length === 0) {
    return {
      products: [],
      variantsByProductId: {},
      colorsByProductId: {},
      categoryFilterTags: {},
      attributeSlugsByProductId: {},
    };
  }

  const [primarySlugByProductId, tags, attrSlugs] = await Promise.all([
    getPrimaryCategorySlugByProductIds(loadedIds),
    getProductCategoryFilterTagsByProductIds(loadedIds),
    getProductAttributeValueSlugsByProductIds(loadedIds),
  ]);

  const { variantsByProductId, colorsByProductId } = variantsColorsMaps(page.variants, page.colors);
  const products = attachImagesAndSlugs(page.products, page.colors, primarySlugByProductId);

  return {
    products,
    variantsByProductId,
    colorsByProductId,
    categoryFilterTags: tags,
    attributeSlugsByProductId: attrSlugs,
  };
}
