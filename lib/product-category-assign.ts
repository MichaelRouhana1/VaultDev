import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

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
  return `${role} is scoped to ${catLabel}, but this product is set to ${productLabel}. Pick a category that matches the product store (or a "both" category).`;
}

/**
 * Ensures the product listing store (radio) agrees with category rows.
 * Root rows (`level === "root"`) are storefront roots only — products use `level === "main"` rows
 * whose `store_type` must match the product (or be `both`).
 */
export async function validateProductCategoryAssignment(
  productStore: ProductListingStore,
  mainCategoryId: number,
  subcategoryId: number | null,
): Promise<string | null> {
  const [main] = await db.select().from(categories).where(eq(categories.id, mainCategoryId)).limit(1);
  if (!main) return "Main category not found";
  if (main.parentId !== null) return "Selected category is not a main category";
  if (main.level === "root") return "Cannot assign products to a store root — choose a main category under that store";
  if (main.level !== "main") return "Selected category must be a main category";
  if (!storeMatches(main.storeType, productStore)) {
    return listingMismatchMessage("Main category", main.storeType, productStore);
  }

  if (subcategoryId != null) {
    const [sub] = await db.select().from(categories).where(eq(categories.id, subcategoryId)).limit(1);
    if (!sub) return "Subcategory not found";
    if (sub.level !== "sub") return "Selected subcategory is invalid";
    if (sub.parentId !== mainCategoryId) return "Subcategory does not belong to the selected main category";
    if (!storeMatches(sub.storeType, productStore)) {
      return listingMismatchMessage("Subcategory", sub.storeType, productStore);
    }
  }
  return null;
}
