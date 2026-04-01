import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
const sql = postgres(url);

async function main() {
  await sql.unsafe(
    `ALTER TABLE "hero_images" ADD COLUMN IF NOT EXISTS "mobile_image_url" text`
  );
  console.log('hero_images.mobile_image_url: ok');

  await sql.unsafe(
    `ALTER TABLE "landing_images" ADD COLUMN IF NOT EXISTS "mobile_image_url" text`
  );
  console.log('landing_images.mobile_image_url: ok');

  await sql.unsafe(
    `ALTER TABLE "lookbook_items" ADD COLUMN IF NOT EXISTS "mobile_image_url" text`
  );
  console.log('lookbook_items.mobile_image_url: ok');

  await sql.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sql.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
