import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "storefront_exchange_rates" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
      "eur_per_usd" numeric(16, 8) NOT NULL,
      "lbp_per_usd" numeric(20, 4) NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "storefront_exchange_rates_singleton_chk" CHECK ("id" = 1)
    )
  `;
  await sql`
    INSERT INTO "storefront_exchange_rates" ("id", "eur_per_usd", "lbp_per_usd")
    VALUES (1, 0.92, 89500)
    ON CONFLICT ("id") DO NOTHING
  `;
  console.log("storefront_exchange_rates ready");
  await sql.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
