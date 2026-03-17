import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

// Use direct connection (5432) - pooler (6543) can hang on schema operations
const url = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
const sql = postgres(url);

async function main() {
  const exists = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'landing_images'
    LIMIT 1
  `;
  if (exists.length > 0) {
    console.log("landing_images table already exists, skipping");
    process.exit(0);
    return;
  }

  await sql.unsafe(`
    CREATE TABLE "landing_images" (
      "id" serial PRIMARY KEY NOT NULL,
      "store_type" "store_type" NOT NULL,
      "image_url" text NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "landing_images_store_type_unique" UNIQUE("store_type")
    )
  `);
  console.log("Created landing_images table");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
