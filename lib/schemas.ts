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

/** Shared fields for admin product create (no variant payload). */
export const productCreateBaseSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  description: z.string().trim().nullable().optional(),
  price: z.string().min(1).regex(/^\d+(\.\d{1,2})?$/, "Valid price is required"),
  storeType: productListingStoreTypeSchema,
  mainCategoryId: z.coerce.number().int().positive(),
  isVisible: z.boolean(),
});

export const productCreateOptionSchema = z.object({
  name: z.string().min(1, "Option name is required").trim(),
  values: z
    .array(z.string().min(1).trim())
    .min(1, "Each option needs at least one value")
    .transform((arr) => [...new Set(arr)]),
});

export const productCreateVariantMatrixRowSchema = z.object({
  sku: z.string().min(1, "SKU is required").trim(),
  stock_quantity: z.number().int().min(0, "Stock cannot be negative"),
  price_override: z.number().positive().optional().nullable(),
  optionValues: z.record(z.string(), z.string()),
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

/** Admin product update: same base fields as create (variants come from FormData JSON). */
export const updateProductSchema = productCreateBaseSchema;
