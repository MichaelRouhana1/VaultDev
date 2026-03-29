import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type ProductListingStore = "streetwear" | "formal";

function storeMatches(catStore: string, productStore: ProductListingStore) {
  return catStore === "both" || catStore === productStore;
}

function listingMismatchMessage(catStore: string, productStore: ProductListingStore) {
  const catLabel =
    catStore === "both" ? "both Streetwear and Formal" : catStore === "formal" ? "Formal" : "Streetwear";
  const productLabel = productStore === "formal" ? "Formal" : "Streetwear";
  return `Main category is scoped to ${catLabel}, but this product is set to ${productLabel}. Pick a category that matches the product store (or a "both" row).`;
}

/** Ensures the product listing store agrees with the main category row. */
export async function validateProductCategoryAssignment(
  productStore: ProductListingStore,
  mainCategoryId: number,
): Promise<string | null> {
  const [main] = await db.select().from(categories).where(eq(categories.id, mainCategoryId)).limit(1);
  if (!main) return "Main category not found";
  if (main.level === "root") return "Cannot assign products to a store root — choose a main category under that store";
  if (main.level !== "main") return "Selected category must be a main category";
  if (!storeMatches(main.storeType, productStore)) {
    return listingMismatchMessage(main.storeType, productStore);
  }
  return null;
}
