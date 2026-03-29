import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, subcategories } from "@/db/schema";
import {
  isSubcategoriesTableMissingError,
  SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE,
} from "@/lib/subcategories-table";

export type ProductListingStore = "streetwear" | "formal";

function storeMatches(catStore: string, productStore: ProductListingStore) {
  return catStore === "both" || catStore === productStore;
}

function listingMismatchMessage(
  role: "Main category" | "Subcategory",
  catStore: string,
  productStore: ProductListingStore,
) {
  const catLabel =
    catStore === "both" ? "both Streetwear and Formal" : catStore === "formal" ? "Formal" : "Streetwear";
  const productLabel = productStore === "formal" ? "Formal" : "Streetwear";
  return `${role} is scoped to ${catLabel}, but this product is set to ${productLabel}. Pick a category that matches the product store (or a "both" row).`;
}

/**
 * Ensures the product listing store agrees with main category and optional subcategory rows.
 */
export async function validateProductCategoryAssignment(
  productStore: ProductListingStore,
  mainCategoryId: number,
  subcategoryId: number | null,
): Promise<string | null> {
  const [main] = await db.select().from(categories).where(eq(categories.id, mainCategoryId)).limit(1);
  if (!main) return "Main category not found";
  if (main.level === "root") return "Cannot assign products to a store root — choose a main category under that store";
  if (main.level !== "main") return "Selected category must be a main category";
  if (!storeMatches(main.storeType, productStore)) {
    return listingMismatchMessage("Main category", main.storeType, productStore);
  }

  if (subcategoryId != null) {
    try {
      const [sub] = await db.select().from(subcategories).where(eq(subcategories.id, subcategoryId)).limit(1);
      if (!sub) return "Subcategory not found";
      if (!storeMatches(sub.storeType, productStore)) {
        return listingMismatchMessage("Subcategory", sub.storeType, productStore);
      }
    } catch (e) {
      if (isSubcategoriesTableMissingError(e)) {
        return SUBCATEGORIES_MIGRATION_REQUIRED_MESSAGE;
      }
      throw e;
    }
  }
  return null;
}
