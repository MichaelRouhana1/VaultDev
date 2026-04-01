CREATE INDEX "product_price_idx" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "product_sale_price_idx" ON "products" USING btree ("sale_price");
