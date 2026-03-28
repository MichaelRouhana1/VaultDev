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
  getAllSubcategories,
  getSubcategories,
  getCategoriesForHome,
} from "./categories";

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
} from "./storefront-products";
