import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS activation_token text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS activation_token_expires timestamp`;
  console.log("orders activation columns ready");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
