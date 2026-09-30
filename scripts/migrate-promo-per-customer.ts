import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    ALTER TABLE "promo_codes" ADD COLUMN IF NOT EXISTS "max_uses_per_customer" integer
  `;
  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TABLE "promo_codes"
        ADD CONSTRAINT "promo_codes_max_uses_per_customer_positive"
        CHECK ("max_uses_per_customer" IS NULL OR "max_uses_per_customer" > 0);
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await sql`
    CREATE INDEX IF NOT EXISTS "orders_promo_code_id_idx" ON "orders" ("promo_code_id")
  `;
  console.log("promo per-customer limit ready");
  await sql.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
