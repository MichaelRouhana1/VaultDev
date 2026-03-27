"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, productCategories, products, productVariants, productColors } from "@/db/schema";
import { uploadProductImages } from "@/lib/uploadImages";
import { getValidCategorySlugs } from "@/actions/categories";
import { auditLog } from "@/lib/audit";
import { productSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { requireAdminAction } from "@/lib/security";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export async function createProduct(formData: FormData): Promise<{ success?: boolean; error?: string; productId?: number }> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    categorySlug: formData.get("category"),
    storeType: formData.get("storeType") || "both",
    isVisible: formData.get("isVisible") === "true",
    color_count: parseInt(String(formData.get("color_count") ?? "0"), 10),
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Create product validation failed", undefined, { errorDetails, formData: Array.from(formData.entries()) });
    return { success: false, error: errorDetails };
  }

  const gate = await requireAdminAction({ auditTarget: "product.create" });
  if (!gate.authorized) return gate.response;
  const { userId } = gate;

  const { name, description, price, categorySlug, storeType, isVisible, color_count: colorCount } = parsed.data;

  const validSlugs = await getValidCategorySlugs();
  if (!validSlugs.includes(categorySlug)) {
    logger.error("Invalid category slug in createProduct", undefined, { categorySlug });
    return { error: "Invalid category" };
  }

  // Parse colors from formData
  const colorEntries: Array<{
    name: string;
    hexCode: string | null;
    imageFiles: File[];
    stockBySize: Record<string, number>;
  }> = [];

  for (let i = 0; i < colorCount; i++) {
    const colorName = (formData.get(`color_${i}_name`) as string)?.trim();
    const colorHex = (formData.get(`color_${i}_hex`) as string)?.trim() || null;
    const imageFiles = formData.getAll(`color_${i}_images`) as File[];
    const stockBySize: Record<string, number> = {};
    for (const size of SIZES) {
      stockBySize[size] = Math.max(0, parseInt(String(formData.get(`color_${i}_stock_${size}`)), 10) || 0);
    }
    if (!colorName) {
      logger.error("Color missing name across variants", undefined, { colorIndex: i });
      return { error: `Color ${i + 1} must have a name` };
    }
    colorEntries.push({
      name: colorName,
      hexCode: colorHex,
      imageFiles: imageFiles.filter((f) => f?.size),
      stockBySize,
    });
  }

  // Upload images for each color
  const colorImageUrls: string[][] = [];
  for (let i = 0; i < colorEntries.length; i++) {
    const prefix = `product-${Date.now()}-${i}`;
    const result = await uploadProductImages(colorEntries[i].imageFiles, prefix);
    if (result.error) {
      logger.error("Failed to upload product images", undefined, { errorDetails: result.error });
      return { error: result.error };
    }
    colorImageUrls.push(result.urls);
  }

  const [catRow] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, categorySlug))
    .limit(1);
  if (!catRow) {
    logger.error("Category slug not found in createProduct", undefined, { categorySlug });
    return { success: false, error: "Invalid category" };
  }

  const productId = await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        name,
        description: description || null,
        price: parseFloat(price).toFixed(2),
        storeType,
        color: colorEntries[0]?.name ?? null,
        isVisible,
      })
      .returning({ id: products.id });

    await tx.insert(productCategories).values({ productId: product.id, categoryId: catRow.id });

    const colorIds: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const [pc] = await tx
        .insert(productColors)
        .values({
          productId: product.id,
          name: colorEntries[i].name,
          hexCode: colorEntries[i].hexCode,
          imageUrls: colorImageUrls[i] ?? [],
        })
        .returning({ id: productColors.id });
      colorIds.push(pc.id);
    }

    for (let i = 0; i < colorEntries.length; i++) {
      const colorId = colorIds[i];
      const stockBySize = colorEntries[i].stockBySize;
      for (const size of SIZES) {
        const stock = stockBySize[size] ?? 0;
        await tx.insert(productVariants).values({
          productId: product.id,
          colorId,
          size,
          stock,
        });
      }
    }

    return product.id;
  });

  auditLog({ userId, action: "product.create", target: String(productId), details: { name } });
  return { productId };
}
