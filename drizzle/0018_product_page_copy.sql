CREATE TABLE "product_page_copy" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_type" "store_type" NOT NULL,
	"description_extra" text,
	"shipping_delivery" text,
	"returns_text" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_page_copy_store_type_unique" UNIQUE("store_type")
);
