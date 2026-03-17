CREATE TABLE "landing_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_type" "store_type" NOT NULL,
	"image_url" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "landing_images_store_type_unique" UNIQUE("store_type")
);
