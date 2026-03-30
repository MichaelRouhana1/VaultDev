CREATE TABLE "product_option_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_option_id" integer NOT NULL,
	"value" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"product_color_id" integer,
	CONSTRAINT "product_option_values_option_slug_uidx" UNIQUE("product_option_id","slug")
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variant_option_values" (
	"product_variant_id" integer NOT NULL,
	"product_option_value_id" integer NOT NULL,
	CONSTRAINT "variant_option_values_product_variant_id_product_option_value_id_pk" PRIMARY KEY("product_variant_id","product_option_value_id")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "price_override" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "stock_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_option_id_product_options_id_fk" FOREIGN KEY ("product_option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_product_color_id_product_colors_id_fk" FOREIGN KEY ("product_color_id") REFERENCES "public"."product_colors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_product_option_value_id_product_option_values_id_fk" FOREIGN KEY ("product_option_value_id") REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_option_values_option_id_idx" ON "product_option_values" USING btree ("product_option_id");--> statement-breakpoint
CREATE INDEX "product_options_product_id_idx" ON "product_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variant_option_values_option_value_id_idx" ON "variant_option_values" USING btree ("product_option_value_id");--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_sku_unique" UNIQUE("sku");