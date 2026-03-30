/**
 * Backfills dynamic variant options from legacy product_variants (color_id + size + stock).
 *
 * Prerequisites:
 * - Apply Drizzle migration `drizzle/0019_product_options_variants.sql` (or `drizzle-kit migrate`).
 * - Prefer direct Postgres URL (port 5432) if the pooler causes issues.
 *
 * Idempotent: safe to re-run. Creates "Color" and "Size" product_options per product that has
 * variants, ensures option values + variant_option_values rows, assigns globally unique skus
 * `VAULT-V-{id}` where sku was null, and sets stock_quantity from legacy `stock`.
 *
 * Usage: npx tsx scripts/migrate-variants.ts
 */
import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  productVariants,
  productColors,
  productOptions,
  productOptionValues,
  variantOptionValues,
} from "../db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) {
  console.error("DATABASE_URL is missing (.env.local or .env).");
  process.exit(1);
}
const databaseUrl = rawDatabaseUrl;

const COLOR_OPTION = "Color";
const SIZE_OPTION = "Size";

const DEFAULT_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function slugifyDisplay(value: string): string {
  const s = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "value";
}

function allocateSlug(base: string, used: Set<string>): string {
  let candidate = base || "value";
  let n = 0;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  used.add(candidate);
  return candidate;
}

function compareSizeLabels(a: string, b: string): number {
  const ia = DEFAULT_SIZE_ORDER.indexOf(a.trim().toUpperCase());
  const ib = DEFAULT_SIZE_ORDER.indexOf(b.trim().toUpperCase());
  const ra = ia === -1 ? 1000 : ia;
  const rb = ib === -1 ? 1000 : ib;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Fails fast with instructions if `0019` DDL was not applied to this database. */
async function assertVariantsSchemaReady(sql: ReturnType<typeof postgres>) {
  const [skuCol, optsTable, junctionTable] = await Promise.all([
    sql`
      SELECT 1 AS ok FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_variants'
        AND column_name = 'sku'
      LIMIT 1
    `,
    sql`
      SELECT 1 AS ok FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'product_options'
      LIMIT 1
    `,
    sql`
      SELECT 1 AS ok FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'variant_option_values'
      LIMIT 1
    `,
  ]);

  if (skuCol.length === 0 || optsTable.length === 0 || junctionTable.length === 0) {
    console.error(`
Schema migration 0019 is not applied on this database (missing product_variants.sku and/or new tables).

Do this first:
  1. Open drizzle/0019_product_options_variants.sql and run it against Postgres (Supabase SQL editor or psql).
  2. Use the direct connection URL (port 5432), not the pooler (6543), for DDL if you hit errors.

Then run again:
  npm run db:migrate:variants
`);
    process.exit(1);
  }
}

async function main() {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client, {
    schema: {
      productVariants,
      productColors,
      productOptions,
      productOptionValues,
      variantOptionValues,
    },
  });

  try {
    await assertVariantsSchemaReady(client);

    const variants = await db.select().from(productVariants);
    if (variants.length === 0) {
      console.log("No product_variants rows — nothing to migrate.");
      return;
    }

    const byProduct = new Map<number, typeof variants>();
    for (const v of variants) {
      const list = byProduct.get(v.productId) ?? [];
      list.push(v);
      byProduct.set(v.productId, list);
    }

    let productsTouched = 0;
    let variantsLinked = 0;

    await db.transaction(async (tx) => {
      for (const [productId, rows] of byProduct) {
        const colorIds = [...new Set(rows.map((r) => r.colorId))];
        const sizeLabels = [...new Set(rows.map((r) => r.size))];
        sizeLabels.sort(compareSizeLabels);

        const colors = await tx
          .select()
          .from(productColors)
          .where(
            and(eq(productColors.productId, productId), inArray(productColors.id, colorIds)),
          );

        if (colors.length !== colorIds.length) {
          console.warn(
            `Product ${productId}: expected ${colorIds.length} color rows, found ${colors.length}. Skipping product.`,
          );
          continue;
        }

        const colorById = new Map(colors.map((c) => [c.id, c]));

        let colorOption = await tx
          .select()
          .from(productOptions)
          .where(
            and(eq(productOptions.productId, productId), eq(productOptions.name, COLOR_OPTION)),
          )
          .limit(1);

        let colorOptionId: number;
        if (colorOption.length === 0) {
          const [inserted] = await tx
            .insert(productOptions)
            .values({ productId, name: COLOR_OPTION, sortOrder: 0 })
            .returning({ id: productOptions.id });
          colorOptionId = inserted.id;
        } else {
          colorOptionId = colorOption[0].id;
        }

        let sizeOption = await tx
          .select()
          .from(productOptions)
          .where(
            and(eq(productOptions.productId, productId), eq(productOptions.name, SIZE_OPTION)),
          )
          .limit(1);

        let sizeOptionId: number;
        if (sizeOption.length === 0) {
          const [inserted] = await tx
            .insert(productOptions)
            .values({ productId, name: SIZE_OPTION, sortOrder: 1 })
            .returning({ id: productOptions.id });
          sizeOptionId = inserted.id;
        } else {
          sizeOptionId = sizeOption[0].id;
        }

        const colorSlugs = new Set<string>();
        const existingColorVals = await tx
          .select()
          .from(productOptionValues)
          .where(eq(productOptionValues.productOptionId, colorOptionId));
        for (const r of existingColorVals) {
          colorSlugs.add(r.slug);
        }

        const colorValueIdByColorPk = new Map<number, number>();
        let colorSort = existingColorVals.length;
        for (const cid of colorIds) {
          const crow = colorById.get(cid);
          if (!crow) continue;

          const existing = await tx
            .select()
            .from(productOptionValues)
            .where(
              and(
                eq(productOptionValues.productOptionId, colorOptionId),
                eq(productOptionValues.productColorId, cid),
              ),
            )
            .limit(1);

          if (existing.length > 0) {
            colorValueIdByColorPk.set(cid, existing[0].id);
            continue;
          }

          const baseSlug = slugifyDisplay(crow.name);
          const slug = allocateSlug(baseSlug, colorSlugs);
          const [ins] = await tx
            .insert(productOptionValues)
            .values({
              productOptionId: colorOptionId,
              value: crow.name,
              slug,
              sortOrder: colorSort,
              productColorId: cid,
            })
            .returning({ id: productOptionValues.id });
          colorValueIdByColorPk.set(cid, ins.id);
          colorSort += 1;
        }

        const sizeSlugs = new Set<string>();
        const existingSizeVals = await tx
          .select()
          .from(productOptionValues)
          .where(eq(productOptionValues.productOptionId, sizeOptionId));
        for (const r of existingSizeVals) {
          sizeSlugs.add(r.slug);
        }

        const sizeValueIdByLabel = new Map<string, number>();
        let sizeSort = existingSizeVals.length;
        for (const label of sizeLabels) {
          const existing = await tx
            .select()
            .from(productOptionValues)
            .where(
              and(
                eq(productOptionValues.productOptionId, sizeOptionId),
                eq(productOptionValues.value, label),
              ),
            )
            .limit(1);

          if (existing.length > 0) {
            sizeValueIdByLabel.set(label, existing[0].id);
            continue;
          }

          const baseSlug = slugifyDisplay(label);
          const slug = allocateSlug(baseSlug, sizeSlugs);
          const [ins] = await tx
            .insert(productOptionValues)
            .values({
              productOptionId: sizeOptionId,
              value: label,
              slug,
              sortOrder: sizeSort,
              productColorId: null,
            })
            .returning({ id: productOptionValues.id });
          sizeValueIdByLabel.set(label, ins.id);
          sizeSort += 1;
        }

        for (const row of rows) {
          const colorValId = colorValueIdByColorPk.get(row.colorId);
          const sizeValId = sizeValueIdByLabel.get(row.size);
          if (colorValId == null || sizeValId == null) {
            console.warn(`Variant ${row.id}: missing color or size option value — skip links.`);
            continue;
          }

          const existingLinks = await tx
            .select()
            .from(variantOptionValues)
            .where(eq(variantOptionValues.productVariantId, row.id));

          if (existingLinks.length === 0) {
            await tx.insert(variantOptionValues).values([
              { productVariantId: row.id, productOptionValueId: colorValId },
              { productVariantId: row.id, productOptionValueId: sizeValId },
            ]);
            variantsLinked += 1;
          }
        }

        productsTouched += 1;
      }

      await tx.execute(
        sql.raw(
          `UPDATE product_variants SET stock_quantity = stock, sku = COALESCE(sku, 'VAULT-V-' || id::text)`,
        ),
      );
    });

    console.log(
      `Done. Products processed: ${productsTouched}. Variants that received new option links (first run only): ${variantsLinked}.`,
    );
    console.log(
      "All variants: stock_quantity synced from stock; sku set to VAULT-V-{id} where sku was null.",
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
