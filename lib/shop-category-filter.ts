import { eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

/** SQL condition: product row matches shop `?cat=` slug (main expands to all subs). */
export async function conditionProductsMatchCategorySlug(slug: string) {
  const [c] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!c) return sql`false`;
  if (c.parentId === null) {
    const subs = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, c.id));
    const subIds = subs.map((s) => s.id);
    return or(
      eq(products.mainCategoryId, c.id),
      subIds.length > 0 ? inArray(products.subcategoryId, subIds) : sql`false`,
    )!;
  }
  return eq(products.subcategoryId, c.id);
}
