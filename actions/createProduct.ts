"use server";

import { z } from "zod";
import { db } from "@/db";
import {
  products,
  productVariants,
  productColors,
  productCollections,
  productAttributeValues,
  productOptions,
  productOptionValues,
  variantOptionValues,
} from "@/db/schema";
import { uploadProductImages } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import {
  productCreateBaseSchema,
  productCreateOptionSchema,
  productCreateVariantMatrixRowSchema,
} from "@/lib/schemas";
import { buildOptionCombos, comboKey } from "@/lib/product-variant-matrix";
import {
  allocateUniqueOptionValueSlug,
  productColorIdForOptionValue,
  resolveLegacyVariantColorId,
  resolveLegacyVariantSize,
} from "@/lib/product-helpers";
import { logger } from "@/lib/logger";
import { requireAdminAction } from "@/lib/security";
import { validateProductCategoryAssignment } from "@/lib/product-category-assign";
import { validateAttributeValueIds } from "@/actions/attributes";
import {
  parseCollectionIdsFromFormData,
  validateProductCollectionAssignments,
} from "@/lib/product-collections";
import { inArray } from "drizzle-orm";

function parseAttributeValueIdsFromForm(formData: FormData): number[] {
  const raw = formData.getAll("attributeValueIds");
  const ids: number[] = [];
  for (const r of raw) {
    const n = parseInt(String(r), 10);
    if (Number.isFinite(n) && n > 0) ids.push(n);
  }
  return [...new Set(ids)];
}

type ProductCreateOptionInput = {
  name: string;
  values: string[];
};

type ProductCreateVariantMatrixInput = {
  sku: string;
  stock_quantity: number;
  price_override?: number | null;
  optionValues: Record<string, string>;
};

export async function createProduct(formData: FormData): Promise<{ success?: boolean; error?: string; productId?: number }> {
  const hasVariants = formData.get("hasVariants") === "true";

  const parsedBase = productCreateBaseSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    storeType: formData.get("storeType"),
    mainCategoryId: formData.get("mainCategoryId"),
    isVisible: formData.get("isVisible") === "true",
  });

  if (!parsedBase.success) {
    const errorDetails = parsedBase.error.issues[0]?.message || "Validation failed";
    logger.error("Create product validation failed", undefined, { errorDetails });
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
    isVisible,
  } = parsedBase.data;

  const colorCount = Math.max(0, parseInt(String(formData.get("color_count") ?? "0"), 10));

  let optionsPayload: ProductCreateOptionInput[] = [];
  let variantsPayload: ProductCreateVariantMatrixInput[] = [];

  if (hasVariants) {
    let rawOptions: unknown;
    let rawVariants: unknown;
    try {
      rawOptions = JSON.parse(String(formData.get("optionsJson") ?? "[]"));
      rawVariants = JSON.parse(String(formData.get("variantsJson") ?? "[]"));
    } catch {
      return { success: false, error: "Invalid options or variants JSON" };
    }

    const optParsed = z.array(productCreateOptionSchema).min(1, "Add at least one option").safeParse(rawOptions);
    if (!optParsed.success) {
      return { success: false, error: optParsed.error.issues[0]?.message ?? "Invalid options" };
    }
    optionsPayload = optParsed.data;

    const varParsed = z
      .array(productCreateVariantMatrixRowSchema)
      .min(1, "Add at least one variant row")
      .safeParse(rawVariants);
    if (!varParsed.success) {
      return { success: false, error: varParsed.error.issues[0]?.message ?? "Invalid variants" };
    }
    variantsPayload = varParsed.data;

    const optionNames = optionsPayload.map((o) => o.name.trim());
    const combos = buildOptionCombos(optionsPayload);
    const expectedKeys = new Set(combos.map((c) => comboKey(optionNames, c)));
    const seen = new Set<string>();
    for (const v of variantsPayload) {
      const k = comboKey(optionNames, v.optionValues);
      if (!expectedKeys.has(k)) {
        return { success: false, error: "Each variant row must match one combination of option values" };
      }
      if (seen.has(k)) {
        return { success: false, error: "Duplicate variant row for the same option combination" };
      }
      seen.add(k);
    }
    if (variantsPayload.length !== combos.length) {
      return { success: false, error: `Expected ${combos.length} variant rows, got ${variantsPayload.length}` };
    }

    const skus = variantsPayload.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) {
      return { success: false, error: "Duplicate SKUs in the variant matrix" };
    }
  } else {
    const defaultSku = String(formData.get("defaultSku") ?? "").trim();
    const defaultStock = parseInt(String(formData.get("defaultStockQuantity") ?? ""), 10);
    if (!defaultSku) {
      return { success: false, error: "SKU is required" };
    }
    if (!Number.isFinite(defaultStock) || defaultStock < 0) {
      return { success: false, error: "Stock quantity must be a non-negative number" };
    }
    if (colorCount !== 1) {
      return {
        success: false,
        error: "Single-variant products need exactly one color entry (for product images).",
      };
    }
    variantsPayload = [
      {
        sku: defaultSku,
        stock_quantity: defaultStock,
        price_override: null,
        optionValues: {},
      },
    ];
  }

  if (hasVariants && colorCount < 1) {
    return { success: false, error: "Add at least one color with images" };
  }

  const attributeValueIds = parseAttributeValueIdsFromForm(formData);
  const attrErr = await validateAttributeValueIds(attributeValueIds);
  if (attrErr) {
    return { success: false, error: attrErr };
  }

  const assignErr = await validateProductCategoryAssignment(storeType, mainCategoryId);
  if (assignErr) {
    logger.error("Invalid product category assignment", undefined, { assignErr, mainCategoryId });
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
  }> = [];

  for (let i = 0; i < colorCount; i++) {
    const colorName = (formData.get(`color_${i}_name`) as string)?.trim();
    const colorHex = (formData.get(`color_${i}_hex`) as string)?.trim() || null;
    const imageFiles = formData.getAll(`color_${i}_images`) as File[];
    if (!colorName) {
      return { success: false, error: `Color ${i + 1} must have a name` };
    }
    colorEntries.push({
      name: colorName,
      hexCode: colorHex,
      imageFiles: imageFiles.filter((f) => f?.size),
    });
  }

  const allSkus = variantsPayload.map((v) => v.sku);
  const existingSku = await db
    .select({ sku: productVariants.sku })
    .from(productVariants)
    .where(inArray(productVariants.sku, allSkus))
    .limit(1);
  if (existingSku.length > 0 && existingSku[0].sku) {
    return { success: false, error: `SKU already in use: ${existingSku[0].sku}` };
  }

  const colorImageUrls: string[][] = [];
  for (let i = 0; i < colorEntries.length; i++) {
    const prefix = `product-${Date.now()}-${i}`;
    const result = await uploadProductImages(colorEntries[i].imageFiles, prefix);
    if (result.error) {
      logger.error("Failed to upload product images", undefined, { errorDetails: result.error });
      return { success: false, error: result.error };
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

    const fallbackColorId = colorIds[0]!;
    const colorNameToId = new Map(
      colorEntries.map((c, i) => [c.name.trim().toLowerCase(), colorIds[i]!] as const),
    );

    if (hasVariants && optionsPayload.length > 0) {
      const optionIds: number[] = [];
      for (let oi = 0; oi < optionsPayload.length; oi++) {
        const o = optionsPayload[oi]!;
        const [row] = await tx
          .insert(productOptions)
          .values({
            productId: product.id,
            name: o.name.trim(),
            sortOrder: oi,
          })
          .returning({ id: productOptions.id });
        optionIds.push(row.id);
      }

      const valueIdByOptionIndex = new Map<number, Map<string, number>>();

      for (let oi = 0; oi < optionsPayload.length; oi++) {
        const o = optionsPayload[oi]!;
        const optionId = optionIds[oi]!;
        const slugUsed = new Set<string>();
        const labelToId = new Map<string, number>();
        let sortOrder = 0;
        for (const val of o.values) {
          const trimmed = val.trim();
          const slug = allocateUniqueOptionValueSlug(trimmed, slugUsed);
          const productColorId = productColorIdForOptionValue(o.name, trimmed, colorNameToId);
          const [ins] = await tx
            .insert(productOptionValues)
            .values({
              productOptionId: optionId,
              value: trimmed,
              slug,
              sortOrder,
              productColorId,
            })
            .returning({ id: productOptionValues.id });
          labelToId.set(trimmed, ins.id);
          sortOrder += 1;
        }
        valueIdByOptionIndex.set(oi, labelToId);
      }

      for (const vrow of variantsPayload) {
        const colorId = resolveLegacyVariantColorId(vrow, optionsPayload, colorNameToId, fallbackColorId);
        const size = resolveLegacyVariantSize(vrow, optionsPayload);
        const priceOverride =
          vrow.price_override != null && vrow.price_override > 0
            ? vrow.price_override.toFixed(2)
            : null;

        const [v] = await tx
          .insert(productVariants)
          .values({
            productId: product.id,
            colorId,
            size,
            stock: vrow.stock_quantity,
            stockQuantity: vrow.stock_quantity,
            sku: vrow.sku,
            priceOverride,
          })
          .returning({ id: productVariants.id });

        for (let oi = 0; oi < optionsPayload.length; oi++) {
          const o = optionsPayload[oi]!;
          const label = vrow.optionValues[o.name];
          if (label == null) {
            throw new Error(`Missing option value for ${o.name}`);
          }
          const map = valueIdByOptionIndex.get(oi)!;
          const optValId = map.get(label.trim());
          if (optValId == null) {
            throw new Error(`Unknown value "${label}" for option ${o.name}`);
          }
          await tx.insert(variantOptionValues).values({
            productVariantId: v.id,
            productOptionValueId: optValId,
          });
        }
      }
    } else {
      const row = variantsPayload[0]!;
      await tx.insert(productVariants).values({
        productId: product.id,
        colorId: fallbackColorId,
        size: "DEFAULT",
        stock: row.stock_quantity,
        stockQuantity: row.stock_quantity,
        sku: row.sku,
        priceOverride:
          row.price_override != null && row.price_override > 0
            ? row.price_override.toFixed(2)
            : null,
      });
    }

    if (collectionIds.length > 0) {
      await tx.insert(productCollections).values(
        collectionIds.map((collectionId) => ({
          productId: product.id,
          collectionId,
        })),
      );
    }

    if (attributeValueIds.length > 0) {
      await tx.insert(productAttributeValues).values(
        attributeValueIds.map((attributeValueId) => ({
          productId: product.id,
          attributeValueId,
        })),
      );
    }

    return product.id;
  });

  auditLog({ userId, action: "product.create", target: String(productId), details: { name } });
  return { productId };
}
