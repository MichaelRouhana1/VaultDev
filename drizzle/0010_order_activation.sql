ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "activation_token" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "activation_token_expires" timestamp;
