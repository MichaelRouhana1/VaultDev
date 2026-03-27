-- Hierarchical `categories` table (renamed from legacy `product_categories`) +
-- new `product_categories` many-to-many junction. Drops legacy `products.category` enum + `category_slug`.

ALTER TABLE "product_categories" RENAME TO "categories";

ALTER INDEX IF EXISTS "product_categories_store_type_idx" RENAME TO "categories_store_type_idx";
ALTER INDEX IF EXISTS "product_categories_home_idx" RENAME TO "categories_home_idx";

CREATE TABLE "product_categories" (
	"product_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

CREATE INDEX IF NOT EXISTS "product_categories_category_id_idx" ON "product_categories" USING btree ("category_id");

INSERT INTO "product_categories" ("product_id", "category_id")
SELECT p."id", c."id"
FROM "products" p
INNER JOIN "categories" c ON c."slug" = p."category_slug"
WHERE p."category_slug" IS NOT NULL;

DROP INDEX IF EXISTS "products_category_slug_idx";

ALTER TABLE "products" DROP COLUMN IF EXISTS "category_slug";
ALTER TABLE "products" DROP COLUMN IF EXISTS "category";

DROP TYPE IF EXISTS "product_category";
