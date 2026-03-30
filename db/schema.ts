import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  decimal,
  boolean,
  integer,
  timestamp,
  pgEnum,
  index,
  jsonb,
  customType,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const categoryLevelEnum = pgEnum("category_level", [
  "root",
  "main",
  "sub",
]);

export const storeTypeEnum = pgEnum("store_type", [
  "streetwear",
  "formal",
  "both",
]);

/** Products belong to exactly one storefront: streetwear OR formal (not `both`). */
export const productListingStoreTypeEnum = pgEnum("product_listing_store_type", [
  "streetwear",
  "formal",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const promoDiscountTypeEnum = pgEnum("promo_discount_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "FREE_SHIPPING",
]);

/** Matches `drizzle/0006_add_product_search_vector.sql` — keep in sync so `drizzle-kit push` does not drop the column. */
const tsvector = customType<{ data: unknown; driverData: unknown }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Main shop categories (e.g. Jeans, Shirts). URLs use `slug`.
 * Physical table name: `categories` (renamed from legacy `product_categories`).
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  image: text("image"),
  showOnHome: boolean("show_on_home").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  level: categoryLevelEnum("level").notNull().default("main"),
  storeType: storeTypeEnum("store_type").notNull().default("streetwear"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("categories_store_type_idx").on(t.storeType),
  index("categories_home_idx").on(t.showOnHome, t.storeType),
]);

/** Facet dimension (e.g. Fit, Style, Material). */
export const attributes = pgTable("attributes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Selectable tag under an attribute; `slug` is globally unique (shop filters, URLs). */
export const attributeValues = pgTable(
  "attribute_values",
  {
    id: serial("id").primaryKey(),
    attributeId: integer("attribute_id")
      .notNull()
      .references(() => attributes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
  },
  (t) => [index("attribute_values_attribute_id_idx").on(t.attributeId)],
);

export const productAttributeValues = pgTable(
  "product_attribute_values",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    attributeValueId: integer("attribute_value_id")
      .notNull()
      .references(() => attributeValues.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.attributeValueId] }),
    index("product_attribute_values_value_id_idx").on(t.attributeValueId),
  ],
);

// Products — `storeType` is streetwear | formal only; main category + many attribute value tags.
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  /** Generated STORED column for FTS — do not insert/update from app code. */
  searchVector: tsvector("search_vector").generatedAlwaysAs(
    sql.raw(
      "to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))",
    ),
  ),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  saleStartsAt: timestamp("sale_starts_at"),
  saleEndsAt: timestamp("sale_ends_at"),
  isSaleActive: boolean("is_sale_active").notNull().default(true),
  color: text("color"),
  isVisible: boolean("is_visible").notNull().default(true),
  /** Soft-delete: hidden from storefront; kept for order history / FK integrity. */
  isArchived: boolean("is_archived").notNull().default(false),
  storeType: productListingStoreTypeEnum("store_type").notNull().default("streetwear"),
  /** Main shop category (`level = main`, not store root). */
  mainCategoryId: integer("main_category_id")
    .notNull()
    .references(() => categories.id),
}, (t) => [
  index("products_store_type_visible_archived_idx").on(t.storeType, t.isVisible, t.isArchived),
  index("products_main_category_id_idx").on(t.mainCategoryId),
  index("products_search_vector_idx").using("gin", t.searchVector),
]);

// Product colors - each color has its own image gallery
export const productColors = pgTable("product_colors", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hexCode: text("hex_code"),
  imageUrls: text("image_urls").array().notNull().default([]),
}, (t) => [index("product_colors_product_id_idx").on(t.productId)]);

// ProductVariants - size + stock per color (legacy columns retained until data cutover)
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  colorId: integer("color_id")
    .notNull()
    .references(() => productColors.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  stock: integer("stock").notNull().default(0),
  /** Globally unique; null allowed until backfill (`scripts/migrate-variants.ts`). */
  sku: text("sku").unique(),
  /** When null, storefront uses base product pricing / sale logic. */
  priceOverride: decimal("price_override", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
}, (t) => [index("product_variants_product_id_idx").on(t.productId)]);

/** Per-product option dimension (e.g. Size, Color). No rows = product uses a single synthetic variant only. */
export const productOptions = pgTable(
  "product_options",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_options_product_id_idx").on(t.productId)],
);

/** Selectable value under a product option; `slug` for URL filters (unique per option). */
export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: serial("id").primaryKey(),
    productOptionId: integer("product_option_id")
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    productColorId: integer("product_color_id").references(() => productColors.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("product_option_values_option_id_idx").on(t.productOptionId),
    unique("product_option_values_option_slug_uidx").on(t.productOptionId, t.slug),
  ],
);

/** Links a purchasable variant to exactly one value per option (enforced in app). */
export const variantOptionValues = pgTable(
  "variant_option_values",
  {
    productVariantId: integer("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    productOptionValueId: integer("product_option_value_id")
      .notNull()
      .references(() => productOptionValues.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productVariantId, t.productOptionValueId] }),
    index("variant_option_values_option_value_id_idx").on(t.productOptionValueId),
  ],
);

/** Marketing / merchandising groups (many-to-many with products). */
export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    storeType: storeTypeEnum("store_type").notNull().default("streetwear"),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("collections_store_type_idx").on(t.storeType)],
);

export const productCollections = pgTable(
  "product_collections",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.collectionId] }),
    index("product_collections_collection_id_idx").on(t.collectionId),
  ],
);

// Promo codes
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: promoDiscountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  guestEmail: text("guest_email"),
  customerName: text("customer_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  addressLine1: text("address_line1").notNull(),
  city: text("city").notNull(),
  subtotalAmount: decimal("subtotal_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  paymentMethod: text("payment_method").notNull().default("COD"),
  /** Guest account activation (email link + success-page registration). Cleared after use. */
  activationToken: text("activation_token"),
  activationTokenExpires: timestamp("activation_token_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("orders_created_at_idx").on(t.createdAt),
]);

// OrderItems
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  size: text("size").notNull(),
  priceAtPurchase: decimal("price_at_purchase", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

// Relations
export const categoriesRelations = relations(categories, () => ({}));

export const attributesRelations = relations(attributes, ({ many }) => ({
  values: many(attributeValues),
}));

export const attributeValuesRelations = relations(attributeValues, ({ one, many }) => ({
  attribute: one(attributes, {
    fields: [attributeValues.attributeId],
    references: [attributes.id],
  }),
  productLinks: many(productAttributeValues),
}));

export const productAttributeValuesRelations = relations(productAttributeValues, ({ one }) => ({
  product: one(products, {
    fields: [productAttributeValues.productId],
    references: [products.id],
  }),
  attributeValue: one(attributeValues, {
    fields: [productAttributeValues.attributeValueId],
    references: [attributeValues.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  mainCategory: one(categories, {
    fields: [products.mainCategoryId],
    references: [categories.id],
    relationName: "product_main_category",
  }),
  variants: many(productVariants),
  colors: many(productColors),
  productOptions: many(productOptions),
  productCollectionLinks: many(productCollections),
  attributeValueLinks: many(productAttributeValues),
  orderItems: many(orderItems),
  wishlistItems: many(wishlists),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  productCollectionLinks: many(productCollections),
}));

export const productCollectionsRelations = relations(productCollections, ({ one }) => ({
  product: one(products, {
    fields: [productCollections.productId],
    references: [products.id],
  }),
  collection: one(collections, {
    fields: [productCollections.collectionId],
    references: [collections.id],
  }),
}));

export const productColorsRelations = relations(productColors, ({ one, many }) => ({
  product: one(products),
  variants: many(productVariants),
  optionValues: many(productOptionValues),
}));

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
  values: many(productOptionValues),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one, many }) => ({
  productOption: one(productOptions, {
    fields: [productOptionValues.productOptionId],
    references: [productOptions.id],
  }),
  productColor: one(productColors, {
    fields: [productOptionValues.productColorId],
    references: [productColors.id],
  }),
  variantLinks: many(variantOptionValues),
}));

export const variantOptionValuesRelations = relations(variantOptionValues, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantOptionValues.productVariantId],
    references: [productVariants.id],
  }),
  optionValue: one(productOptionValues, {
    fields: [variantOptionValues.productOptionValueId],
    references: [productOptionValues.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products),
  color: one(productColors),
  optionValueLinks: many(variantOptionValues),
}));

export const promoCodesRelations = relations(promoCodes, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  promoCode: one(promoCodes),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders),
  product: one(products),
}));

// Section visibility settings (e.g. show/hide "Get the Look" on home page)
export const sectionSettings = pgTable("section_settings", {
  id: serial("id").primaryKey(),
  sectionKey: text("section_key").notNull().unique(),
  isVisible: boolean("is_visible").notNull().default(true),
});

/** Store-specific copy for PDP accordion (additional description + shipping + returns). */
export const productPageCopy = pgTable("product_page_copy", {
  id: serial("id").primaryKey(),
  storeType: storeTypeEnum("store_type").notNull().unique(),
  descriptionExtra: text("description_extra"),
  shippingDelivery: text("shipping_delivery"),
  returnsText: text("returns_text"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Get the Look section - admin-managed categories
export const lookbookItems = pgTable("lookbook_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  imageUrl: text("image_url").notNull(),
  href: text("href").notNull().default("/shop"),
  order: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  storeType: storeTypeEnum("store_type").notNull().default("streetwear"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("lookbook_items_store_type_idx").on(t.storeType)]);

// Hero images for slideshow
export const heroImages = pgTable("hero_images", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  order: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  storeType: storeTypeEnum("store_type").notNull().default("streetwear"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("hero_images_store_type_idx").on(t.storeType),
]);

// Landing page store selection images (Streetwear / Formal)
export const landingImages = pgTable("landing_images", {
  id: serial("id").primaryKey(),
  storeType: storeTypeEnum("store_type").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wishlists
export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Security / admin audit trail (persisted for dashboard Security Logs UI). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(),
    userId: text("user_id"),
    details: jsonb("details").$type<Record<string, unknown> | null>(),
    ipAddress: text("ip_address").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_logs_action_created_idx").on(t.action, t.createdAt)],
);

/** Admin dashboard notifications (e.g. low stock after orders). */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull().default("LOW_STOCK"),
    message: text("message").notNull(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
    /** Identifies the variant for deduping unread low-stock alerts. */
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_created_idx").on(t.createdAt),
    index("notifications_variant_unread_idx").on(t.variantId, t.isRead),
  ],
);

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  product: one(products),
}));

// Exported types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type AttributeRow = typeof attributes.$inferSelect;
export type NewAttributeRow = typeof attributes.$inferInsert;
export type AttributeValueRow = typeof attributeValues.$inferSelect;
export type NewAttributeValueRow = typeof attributeValues.$inferInsert;

/** @deprecated Use `Category` — name kept for incremental refactors */
export type ProductCategory = Category;
/** @deprecated Use `NewCategory` */
export type NewProductCategory = NewCategory;

export type Product = typeof products.$inferSelect;
/** Row without generated `searchVector` — safe for RSC / JSON (shop listings, cards). */
export type StorefrontProduct = Omit<Product, "searchVector">;
export type NewProduct = typeof products.$inferInsert;

export type ProductColor = typeof productColors.$inferSelect;
export type NewProductColor = typeof productColors.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type ProductOption = typeof productOptions.$inferSelect;
export type NewProductOption = typeof productOptions.$inferInsert;
export type ProductOptionValue = typeof productOptionValues.$inferSelect;
export type NewProductOptionValue = typeof productOptionValues.$inferInsert;
export type VariantOptionValue = typeof variantOptionValues.$inferSelect;
export type NewVariantOptionValue = typeof variantOptionValues.$inferInsert;

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;

export type SectionSetting = typeof sectionSettings.$inferSelect;
export type NewSectionSetting = typeof sectionSettings.$inferInsert;

export type ProductPageCopyRow = typeof productPageCopy.$inferSelect;
export type NewProductPageCopyRow = typeof productPageCopy.$inferInsert;

export type LookbookItem = typeof lookbookItems.$inferSelect;
export type NewLookbookItem = typeof lookbookItems.$inferInsert;

export type HeroImage = typeof heroImages.$inferSelect;
export type NewHeroImage = typeof heroImages.$inferInsert;

export type LandingImage = typeof landingImages.$inferSelect;
export type NewLandingImage = typeof landingImages.$inferInsert;

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type ProductCollection = typeof productCollections.$inferSelect;
export type NewProductCollection = typeof productCollections.$inferInsert;
