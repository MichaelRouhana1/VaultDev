CREATE TABLE IF NOT EXISTS "collections" (
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
CREATE INDEX IF NOT EXISTS "collections_store_type_idx" ON "collections" ("store_type");
CREATE TABLE IF NOT EXISTS "product_collections" (
	"product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"collection_id" integer NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
	PRIMARY KEY ("product_id", "collection_id")
);
CREATE INDEX IF NOT EXISTS "product_collections_collection_id_idx" ON "product_collections" ("collection_id");
