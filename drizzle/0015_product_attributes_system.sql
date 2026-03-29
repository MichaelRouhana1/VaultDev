-- Attributes + many-to-many product tags; removes legacy subcategories.
CREATE TABLE IF NOT EXISTS "attributes" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "attribute_values" (
  "id" serial PRIMARY KEY NOT NULL,
  "attribute_id" integer NOT NULL REFERENCES "attributes"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS "attribute_values_attribute_id_idx" ON "attribute_values" ("attribute_id");

CREATE TABLE IF NOT EXISTS "product_attribute_values" (
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "attribute_value_id" integer NOT NULL REFERENCES "attribute_values"("id") ON DELETE CASCADE,
  PRIMARY KEY ("product_id", "attribute_value_id")
);
CREATE INDEX IF NOT EXISTS "product_attribute_values_value_id_idx" ON "product_attribute_values" ("attribute_value_id");

ALTER TABLE "products" DROP COLUMN IF EXISTS "subcategory_id";

DROP TABLE IF EXISTS "subcategories";
