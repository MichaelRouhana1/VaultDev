/**
 * One-shot DB upgrade: creates `subcategories`, moves old child rows out of `categories`,
 * fixes `products.subcategory_id`, drops `categories.parent_id`.
 *
 * Run from the project root:
 *   npm run db:migrate:subcategories
 *
 * Uses DATABASE_URL from .env.local (same as the app).
 * If Supabase errors on port 6543 (pooler), switch DATABASE_URL to the "direct" host
 * with port 5432 (Supabase → Project Settings → Database → Connection string → URI, direct).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

function requireDatabaseUrl(): string {
  const v = process.env.DATABASE_URL;
  if (!v || v.length < 8) {
    console.error("Missing DATABASE_URL. Add it to .env.local (your Supabase Postgres URL).");
    process.exit(1);
  }
  return v;
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  if (databaseUrl.includes(":6543")) {
    console.warn(
      "\n⚠️  You are using port 6543 (pooler). If the migration fails, change DATABASE_URL to the direct connection (port 5432) in Supabase → Database settings.\n",
    );
  }

  const file = join(process.cwd(), "drizzle", "0014_independent_subcategories.sql");
  const raw = readFileSync(file, "utf8");
  const chunks = raw
    .split(/--> statement-breakpoint/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    for (let i = 0; i < chunks.length; i++) {
      const statement = chunks[i];
      console.log(`Running step ${i + 1}/${chunks.length}…`);
      await sql.unsafe(statement);
    }
    console.log("\n✅ Done. Restart `npm run dev` and open Admin → Subcategories.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:\n", err.message ?? err);
  console.error(
    "\nTry: use the direct Postgres URL (port 5432) in DATABASE_URL, then run this command again.\n",
  );
  process.exit(1);
});
