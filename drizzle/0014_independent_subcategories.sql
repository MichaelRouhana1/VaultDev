-- Independent `subcategories` table; `products.subcategory_id` references it.
-- Migrates rows from `categories` where `parent_id` was set, then drops `parent_id`.

CREATE TABLE IF NOT EXISTS "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"store_type" "store_type" DEFAULT 'streetwear' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subcategories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subcategories_store_type_idx" ON "subcategories" USING btree ("store_type");
--> statement-breakpoint
ALTER TABLE "subcategories" ADD COLUMN IF NOT EXISTS "_legacy_category_id" integer;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_legacy_category_id_idx" ON "subcategories" ("_legacy_category_id");
--> statement-breakpoint
INSERT INTO "subcategories" ("slug", "label", "image", "sort_order", "store_type", "created_at", "_legacy_category_id")
SELECT "slug", "label", "image", "sort_order", "store_type", "created_at", "id"
FROM "categories"
WHERE "parent_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "products" AS p
SET "subcategory_id" = s."id"
FROM "subcategories" AS s
WHERE p."subcategory_id" IS NOT NULL AND p."subcategory_id" = s."_legacy_category_id";
--> statement-breakpoint
UPDATE "products"
SET "subcategory_id" = NULL
WHERE "subcategory_id" IS NOT NULL
  AND "subcategory_id" NOT IN (SELECT "id" FROM "subcategories");
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_subcategory_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_subcategory_id_fkey";
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
DELETE FROM "categories" WHERE "parent_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_fkey";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "parent_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "subcategories_legacy_category_id_idx";
--> statement-breakpoint
ALTER TABLE "subcategories" DROP COLUMN IF EXISTS "_legacy_category_id";
