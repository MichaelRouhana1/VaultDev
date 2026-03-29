import { z } from "zod";

/** Store type values matching db schema storeTypeEnum */
export const STORE_TYPE_VALUES = ["streetwear", "formal", "both"] as const;
export type StoreType = (typeof STORE_TYPE_VALUES)[number];
export const storeTypeSchema = z.enum(STORE_TYPE_VALUES);

/** Products may only list under streetwear or formal (see `product_listing_store_type`). */
export const PRODUCT_LISTING_STORE_VALUES = ["streetwear", "formal"] as const;
export const productListingStoreTypeSchema = z.enum(PRODUCT_LISTING_STORE_VALUES);

export const collectionFormSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  slug: z.string().min(1).trim().toLowerCase().regex(/^[a-z0-9-]+$/),
  description: z.string().trim().nullable().optional(),
  storeType: storeTypeSchema.default("streetwear"),
});

export const categorySchema = z.object({
  slug: z.string().min(1).trim().toLowerCase().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).trim(),
  showOnHome: z.boolean(),
  level: z.enum(["root", "main"]).default("main"),
  storeType: storeTypeSchema.default("both"),
});

export const productSchema = z.object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().trim().nullable().optional(),
    price: z.string().min(1).regex(/^\d+(\.\d{1,2})?$/, "Valid price is required"),
    storeType: productListingStoreTypeSchema,
    mainCategoryId: z.coerce.number().int().positive(),
    isVisible: z.boolean(),
    color_count: z.number().int().min(1, "Add at least one color"),
});

export const updateProductSchema = z.object({
    name: z.string().min(1, "Name is required").trim(),
    description: z.string().trim().nullable().optional(),
    price: z.string().min(1).regex(/^\d+(\.\d{1,2})?$/, "Valid price is required"),
    storeType: productListingStoreTypeSchema,
    mainCategoryId: z.coerce.number().int().positive(),
    isVisible: z.boolean(),
    color_count: z.number().int().min(1, "Add at least one color"),
});
