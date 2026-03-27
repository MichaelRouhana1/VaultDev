"use server";

import { db } from "@/db";
import { products, productVariants, productColors, productCollections } from "@/db/schema";
import { uploadProductImages } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { productSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { requireAdminAction } from "@/lib/security";
import { validateProductCategoryAssignment } from "@/lib/product-category-assign";
import {
  parseCollectionIdsFromFormData,
  validateProductCollectionAssignments,
} from "@/lib/product-collections";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export async function createProduct(formData: FormData): Promise<{ success?: boolean; error?: string; productId?: number }> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    storeType: formData.get("storeType"),
    mainCategoryId: formData.get("mainCategoryId"),
    subcategoryId: formData.get("subcategoryId") ?? "",
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

  const {
    name,
    description,
    price,
    storeType,
    mainCategoryId,
    subcategoryId,
    isVisible,
    color_count: colorCount,
  } = parsed.data;

  const assignErr = await validateProductCategoryAssignment(storeType, mainCategoryId, subcategoryId);
  if (assignErr) {
    logger.error("Invalid product category assignment", undefined, { assignErr, mainCategoryId, subcategoryId });
    return { success: false, error: assignErr };
  }

  const collectionIds = parseCollectionIdsFromFormData(formData);
  const collErr = await validateProductCollectionAssignments(storeType, collectionIds);
  if (collErr) {
    logger.error("Invalid product collection assignment", undefined, { collErr, collectionIds });
    return { success: false, error: collErr };
  }

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

  const productId = await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        name,
        description: description || null,
        price: parseFloat(price).toFixed(2),
        storeType,
        mainCategoryId,
        subcategoryId,
        color: colorEntries[0]?.name ?? null,
        isVisible,
      })
      .returning({ id: products.id });

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

    if (collectionIds.length > 0) {
      await tx.insert(productCollections).values(
        collectionIds.map((collectionId) => ({
          productId: product.id,
          collectionId,
        })),
      );
    }

    return product.id;
  });

  auditLog({ userId, action: "product.create", target: String(productId), details: { name } });
  return { productId };
}
