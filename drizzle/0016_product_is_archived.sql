-- Soft-delete flag: archived products stay in DB for order_items FKs but are hidden from the storefront.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;

-- Replace storefront listing index to include archive flag.
DROP INDEX IF EXISTS "products_store_type_visible_idx";
CREATE INDEX IF NOT EXISTS "products_store_type_visible_archived_idx" ON "products" ("store_type", "is_visible", "is_archived");
