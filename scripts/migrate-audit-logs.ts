import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id serial PRIMARY KEY NOT NULL,
      action text NOT NULL,
      user_id text,
      details jsonb,
      ip_address text DEFAULT '' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx
    ON audit_logs (action, created_at)
  `;
  console.log("audit_logs table ready");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
