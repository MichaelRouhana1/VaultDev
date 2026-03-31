import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";
import { generateOrderNumber } from "../lib/utils";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text`;

  const existing = new Set(
    (
      await sql<{ order_number: string | null }[]>`
        SELECT order_number FROM orders WHERE order_number IS NOT NULL
      `
    )
      .map((r) => r.order_number)
      .filter((v): v is string => Boolean(v)),
  );

  const rows = await sql<{ id: number; created_at: Date | string }[]>`
    SELECT id, created_at FROM orders WHERE order_number IS NULL ORDER BY id
  `;

  for (const r of rows) {
    const createdAt = r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
    let assigned: string | undefined;
    for (let i = 0; i < 64; i++) {
      const candidate = generateOrderNumber(createdAt);
      if (!existing.has(candidate)) {
        existing.add(candidate);
        assigned = candidate;
        break;
      }
    }
    if (!assigned) {
      throw new Error(`Could not assign order_number for order id ${r.id}`);
    }
    await sql`UPDATE orders SET order_number = ${assigned} WHERE id = ${r.id}`;
  }

  await sql`ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL`;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx ON orders (order_number)
  `;

  console.log("orders.order_number column backfilled and constrained");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
