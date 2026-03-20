CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'LOW_STOCK' NOT NULL,
	"message" text NOT NULL,
	"product_id" integer,
	"variant_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
CREATE INDEX IF NOT EXISTS "notifications_variant_unread_idx" ON "notifications" ("variant_id","is_read");
