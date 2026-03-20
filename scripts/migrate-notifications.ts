import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id serial PRIMARY KEY NOT NULL,
      type text DEFAULT 'LOW_STOCK' NOT NULL,
      message text NOT NULL,
      product_id integer REFERENCES products(id) ON DELETE CASCADE,
      variant_id integer REFERENCES product_variants(id) ON DELETE CASCADE,
      is_read boolean DEFAULT false NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS notifications_variant_unread_idx ON notifications (variant_id, is_read)
  `;
  console.log("notifications table ready");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
