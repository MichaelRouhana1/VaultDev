import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, subcategories } from "@/db/schema";
import { isSubcategoriesTableMissingError } from "@/lib/subcategories-table";

/** SQL condition: product row matches shop `?cat=` slug (main category id or subcategory id). */
export async function conditionProductsMatchCategorySlug(slug: string) {
  const [main] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (main) {
    return eq(products.mainCategoryId, main.id);
  }
  try {
    const [sub] = await db.select().from(subcategories).where(eq(subcategories.slug, slug)).limit(1);
    if (sub) {
      return eq(products.subcategoryId, sub.id);
    }
  } catch (e) {
    if (!isSubcategoriesTableMissingError(e)) throw e;
  }
  return sql`false`;
}
