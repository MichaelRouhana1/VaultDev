CREATE TYPE "public"."product_listing_store_type" AS ENUM('streetwear', 'formal');--> statement-breakpoint
CREATE TABLE "attribute_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"attribute_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "attribute_values_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "attributes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"store_type" "store_type" DEFAULT 'streetwear' NOT NULL,
	"description" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_attribute_values" (
	"product_id" integer NOT NULL,
	"attribute_value_id" integer NOT NULL,
	CONSTRAINT "product_attribute_values_product_id_attribute_value_id_pk" PRIMARY KEY("product_id","attribute_value_id")
);
--> statement-breakpoint
CREATE TABLE "product_collections" (
	"product_id" integer NOT NULL,
	"collection_id" integer NOT NULL,
	CONSTRAINT "product_collections_product_id_collection_id_pk" PRIMARY KEY("product_id","collection_id")
);
--> statement-breakpoint
ALTER TABLE "product_categories" RENAME TO "categories";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "product_categories_slug_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "product_categories_parent_id_product_categories_id_fk";
--> statement-breakpoint
DROP INDEX "product_categories_store_type_idx";--> statement-breakpoint
DROP INDEX "product_categories_home_idx";--> statement-breakpoint
DROP INDEX "products_store_type_visible_idx";--> statement-breakpoint
DROP INDEX "products_category_slug_idx";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "store_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "store_type" SET DATA TYPE "public"."product_listing_store_type" USING "store_type"::text::"public"."product_listing_store_type";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "store_type" SET DEFAULT 'streetwear';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "main_category_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_value_id_attribute_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attribute_values_attribute_id_idx" ON "attribute_values" USING btree ("attribute_id");--> statement-breakpoint
CREATE INDEX "collections_store_type_idx" ON "collections" USING btree ("store_type");--> statement-breakpoint
CREATE INDEX "product_attribute_values_value_id_idx" ON "product_attribute_values" USING btree ("attribute_value_id");--> statement-breakpoint
CREATE INDEX "product_collections_collection_id_idx" ON "product_collections" USING btree ("collection_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_main_category_id_categories_id_fk" FOREIGN KEY ("main_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_store_type_idx" ON "categories" USING btree ("store_type");--> statement-breakpoint
CREATE INDEX "categories_home_idx" ON "categories" USING btree ("show_on_home","store_type");--> statement-breakpoint
CREATE INDEX "products_store_type_visible_archived_idx" ON "products" USING btree ("store_type","is_visible","is_archived");--> statement-breakpoint
CREATE INDEX "products_main_category_id_idx" ON "products" USING btree ("main_category_id");--> statement-breakpoint
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category_slug";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_unique" UNIQUE("slug");--> statement-breakpoint
DROP TYPE "public"."product_category";