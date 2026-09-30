ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "max_uses_per_customer" integer;

DO $$ BEGIN
  ALTER TABLE "promo_codes"
    ADD CONSTRAINT "promo_codes_max_uses_per_customer_positive"
    CHECK ("max_uses_per_customer" IS NULL OR "max_uses_per_customer" > 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "orders_promo_code_id_idx" ON "orders" ("promo_code_id");
