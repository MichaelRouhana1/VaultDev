-- P4: Storefront / catalog performance indexes
-- Replaces legacy single-column products.store_type index with composite + category_slug.
-- Safe to run once on DBs that already have prior migrations applied.

DROP INDEX IF EXISTS "products_store_type_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lookbook_items_store_type_idx" ON "lookbook_items" USING btree ("store_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_home_idx" ON "product_categories" USING btree ("show_on_home","store_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_colors_product_id_idx" ON "product_colors" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_store_type_visible_idx" ON "products" USING btree ("store_type","is_visible");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_slug_idx" ON "products" USING btree ("category_slug");
