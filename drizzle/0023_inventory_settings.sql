CREATE TABLE IF NOT EXISTS "inventory_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_settings_singleton_chk" CHECK ("id" = 1)
);

INSERT INTO "inventory_settings" ("id", "low_stock_threshold")
VALUES (1, 5)
ON CONFLICT ("id") DO NOTHING;
