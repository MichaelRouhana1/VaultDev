import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

/** SQL condition: product row matches shop `?cat=` slug (main category only). */
export async function conditionProductsMatchCategorySlug(slug: string) {
  const [main] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (main) {
    return eq(products.mainCategoryId, main.id);
  }
  return sql`false`;
}
