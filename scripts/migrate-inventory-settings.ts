import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "inventory_settings" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
      "low_stock_threshold" integer DEFAULT 5 NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "inventory_settings_singleton_chk" CHECK ("id" = 1)
    )
  `;
  await sql`
    INSERT INTO "inventory_settings" ("id", "low_stock_threshold")
    VALUES (1, 5)
    ON CONFLICT ("id") DO NOTHING
  `;
  console.log("inventory_settings ready");
  await sql.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
