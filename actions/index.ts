"use server";

/**
 * Barrel for server actions / cached storefront readers.
 * Prefer importing from specific modules in app code; this file is for discoverability and docs.
 */

export {
  getValidCategorySlugs,
  getStoreCategorySlugs,
  getCategories,
  getCategoriesForHome,
} from "./categories";

export { getStoreCategories, STOREFRONT_CATEGORIES_CACHE_TAG } from "@/lib/storefront-categories";

export {
  getAttributesWithValues,
  getAttributesWithValuesAdmin,
  getProductAttributeValueIds,
  resolveAttributeSlugsToIds,
  validateAttributeValueIds,
  createAttribute,
  deleteAttribute,
  createAttributeValue,
  deleteAttributeValue,
} from "./attributes";

export {
  getHomeDiscoverProductsWithFirstImage,
  getShopProductsForStore,
  getProductVariantsByProductIds,
  getProductColorsByProductIds,
  getPublicProductTitleForMetadata,
  getPublicProductDetailForStore,
  getSimilarVisibleProductsExcept,
  getPrimaryCategorySlugForProduct,
  getPrimaryCategorySlugByProductIds,
  getProductCategoryFilterTagsByProductIds,
  getProductAttributeValueSlugsByProductIds,
} from "./storefront-products";

export { getRecommendedSearchProducts, getPaginatedSearchResults } from "./search";
export type { SearchResultsFilters, SearchProductRow } from "./search";

export { getRecommendedProducts, getSearchResults } from "./search-page-data";
export type { SearchProductCardRow } from "./search-page-data";
