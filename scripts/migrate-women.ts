import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

// Use direct connection (5432) - pooler (6543) can hang on schema operations
const url = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
const sql = postgres(url);

async function main() {
  // ADD VALUE cannot be used in the same transaction that later reads the value; run each on its own.
  await sql.unsafe(`ALTER TYPE "store_type" ADD VALUE IF NOT EXISTS 'women'`);
  console.log("store_type: ensured 'women'");
  await sql.unsafe(`ALTER TYPE "product_listing_store_type" ADD VALUE IF NOT EXISTS 'women'`);
  console.log("product_listing_store_type: ensured 'women'");

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE "landing_gender" AS ENUM ('men', 'women');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  console.log("landing_gender enum ensured");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "gender_landing_images" (
      "id" serial PRIMARY KEY NOT NULL,
      "gender" "landing_gender" NOT NULL,
      "image_url" text NOT NULL,
      "mobile_image_url" text,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "gender_landing_images_gender_unique" UNIQUE("gender")
    )
  `);
  console.log("gender_landing_images table ensured");

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
