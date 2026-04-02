import { products } from "@/db/schema";

/** Storefront listing / cards: omit generated `searchVector`; matches `StorefrontProduct` needs. */
export const listingProductColumns = {
  id: products.id,
  name: products.name,
  nameEn: products.nameEn,
  nameFr: products.nameFr,
  nameAr: products.nameAr,
  description: products.description,
  descriptionEn: products.descriptionEn,
  descriptionFr: products.descriptionFr,
  descriptionAr: products.descriptionAr,
  price: products.price,
  salePrice: products.salePrice,
  saleStartsAt: products.saleStartsAt,
  saleEndsAt: products.saleEndsAt,
  isSaleActive: products.isSaleActive,
  color: products.color,
  isVisible: products.isVisible,
  storeType: products.storeType,
  mainCategoryId: products.mainCategoryId,
} as const;
