CREATE TABLE IF NOT EXISTS "storefront_exchange_rates" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"eur_per_usd" numeric(16, 8) NOT NULL,
	"lbp_per_usd" numeric(20, 4) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "storefront_exchange_rates_singleton_chk" CHECK ("id" = 1)
);

INSERT INTO "storefront_exchange_rates" ("id", "eur_per_usd", "lbp_per_usd")
VALUES (1, 0.92, 89500)
ON CONFLICT ("id") DO NOTHING;
