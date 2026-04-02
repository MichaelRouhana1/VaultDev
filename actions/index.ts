"use server";

/**
 * Barrel for server actions / cached storefront readers.
 * Prefer importing from specific modules in app code; this file is for discoverability and docs.
 */

export {
  getValidCategorySlugs,
  getStoreCategorySlugs,
  getStoreCategories,
  getCategories,
  getCategoriesForHome,
} from "./categories";

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
