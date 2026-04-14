"use server";

import { eq, inArray } from "drizzle-orm";
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
import {
  parseTrustedR2ImageUrlArray,
  parseTrustedR2ImageUrlArrayFromFormKey,
} from "@/lib/parse-trusted-r2-image-urls";
import { auditLog } from "@/lib/audit";
import {
  productCreateOptionSchema,
  productCreateVariantMatrixRowSchema,
  updateProductSchema,
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

type ProductUpdateOptionInput = { name: string; values: string[] };
type ProductUpdateVariantMatrixInput = {
  sku: string;
  stock_quantity: number;
  price_override?: number | null;
  optionValues: Record<string, string>;
};

function parseAttributeValueIdsFromForm(formData: FormData): number[] {
  const raw = formData.getAll("attributeValueIds");
  const ids: number[] = [];
  for (const r of raw) {
    const n = parseInt(String(r), 10);
    if (Number.isFinite(n) && n > 0) ids.push(n);
  }
  return [...new Set(ids)];
}

export async function updateProduct(
  productId: number,
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const parsedId = z.number().int().positive().safeParse(productId);
  if (!parsedId.success) {
    logger.error("Update product invalid ID", undefined, { productId });
    return { success: false, error: "Validation failed" };
  }
  const validProductId = parsedId.data;

  const hasVariants = formData.get("hasVariants") === "true";

  const parsedBase = updateProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    storeType: formData.get("storeType"),
    mainCategoryId: formData.get("mainCategoryId"),
    isVisible: formData.get("isVisible") === "true",
  });

  if (!parsedBase.success) {
    const errorDetails = parsedBase.error.issues[0]?.message || "Validation failed";
    logger.error("Update product validation failed", undefined, { errorDetails, productId });
    return { success: false, error: errorDetails };
  }

  const gate = await requireAdminAction({ auditTarget: "product.update" });
  if (!gate.authorized) return gate.response;
  const { userId } = gate;

  const [existingProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, validProductId))
    .limit(1);
  if (!existingProduct) {
    return { success: false, error: "Product not found" };
  }

  const {
    name,
    description,
    price,
    storeType,
    mainCategoryId,
    isVisible,
  } = parsedBase.data;

  const colorCount = Math.max(0, parseInt(String(formData.get("color_count") ?? "0"), 10));

  let optionsPayload: ProductUpdateOptionInput[] = [];
  let variantsPayload: ProductUpdateVariantMatrixInput[] = [];

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
      return {
        success: false,
        error: `Expected ${combos.length} variant rows, got ${variantsPayload.length}`,
      };
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
    logger.error("Invalid product category assignment in updateProduct", undefined, { assignErr, productId });
    return { success: false, error: assignErr };
  }

  const collectionIds = parseCollectionIdsFromFormData(formData);
  const collErr = await validateProductCollectionAssignments(storeType, collectionIds);
  if (collErr) {
    logger.error("Invalid product collection assignment in updateProduct", undefined, { collErr, productId });
    return { success: false, error: collErr };
  }

  type ColorEntry = {
    existingId: number | null;
    name: string;
    hexCode: string | null;
    imageUrls: string[];
  };

  const colorEntries: ColorEntry[] = [];

  for (let i = 0; i < colorCount; i++) {
    const rawId = formData.get(`color_${i}_id`) as string;
    const existingId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : null;
    const colorName = (formData.get(`color_${i}_name`) as string)?.trim();
    const colorHex = (formData.get(`color_${i}_hex`) as string)?.trim() || null;
    const existingUrlsRaw = formData.get(`color_${i}_existing_urls`) as string;
    let existingParsed: unknown = [];
    try {
      existingParsed = existingUrlsRaw ? JSON.parse(existingUrlsRaw) : [];
    } catch {
      return { success: false, error: `Color ${i + 1}: invalid existing image URLs` };
    }
    const existingTrusted = parseTrustedR2ImageUrlArray(existingParsed);
    if (!existingTrusted.ok) {
      return { success: false, error: `Color ${i + 1}: ${existingTrusted.error}` };
    }
    const newUrlsParsed = parseTrustedR2ImageUrlArrayFromFormKey(formData, `color_${i}_newImageUrls`);
    if (!newUrlsParsed.ok) {
      return { success: false, error: newUrlsParsed.error };
    }
    if (!colorName) {
      return { success: false, error: `Color ${i + 1} must have a name` };
    }
    const imageUrls = [...existingTrusted.urls, ...newUrlsParsed.urls];
    if (imageUrls.length === 0) {
      return { success: false, error: `Color ${i + 1} needs at least one image` };
    }
    colorEntries.push({
      existingId,
      name: colorName,
      hexCode: colorHex,
      imageUrls,
    });
  }

  const incomingSkus = variantsPayload.map((v) => v.sku.trim());
  const skuConflicts = await db
    .select({ sku: productVariants.sku, pid: productVariants.productId })
    .from(productVariants)
    .where(inArray(productVariants.sku, incomingSkus));
  for (const row of skuConflicts) {
    if (row.pid !== validProductId && row.sku) {
      return { success: false, error: `SKU already in use: ${row.sku}` };
    }
  }

  const beforeStockBySku = new Map<string, number>();
  const beforeRows = await db
    .select({ sku: productVariants.sku, stockQuantity: productVariants.stockQuantity })
    .from(productVariants)
    .where(eq(productVariants.productId, validProductId));
  for (const r of beforeRows) {
    if (r.sku?.trim()) {
      beforeStockBySku.set(r.sku.trim(), r.stockQuantity ?? 0);
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price).toFixed(2),
        storeType,
        mainCategoryId,
        color: colorEntries[0]?.name ?? null,
        isVisible,
      })
      .where(eq(products.id, validProductId));

    const existingColors = await tx
      .select()
      .from(productColors)
      .where(eq(productColors.productId, validProductId));

    const colorIds: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const entry = colorEntries[i];
      const imageUrls = entry.imageUrls;

      const existingColor = entry.existingId != null ? existingColors.find((c) => c.id === entry.existingId) : null;
      if (existingColor) {
        await tx
          .update(productColors)
          .set({
            name: entry.name,
            hexCode: entry.hexCode,
            imageUrls,
          })
          .where(eq(productColors.id, existingColor.id));
        colorIds.push(existingColor.id);
      } else {
        const [inserted] = await tx
          .insert(productColors)
          .values({
            productId: validProductId,
            name: entry.name,
            hexCode: entry.hexCode,
            imageUrls,
          })
          .returning({ id: productColors.id });
        colorIds.push(inserted.id);
      }
    }

    const keptIds = new Set(colorIds);
    for (const c of existingColors) {
      if (!keptIds.has(c.id)) {
        await tx.delete(productVariants).where(eq(productVariants.colorId, c.id));
        await tx.delete(productColors).where(eq(productColors.id, c.id));
      }
    }

    await tx.delete(productOptions).where(eq(productOptions.productId, validProductId));

    const existingVariants = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, validProductId));

    const existingBySku = new Map<string, (typeof existingVariants)[number]>();
    for (const ev of existingVariants) {
      const s = ev.sku?.trim();
      if (s) existingBySku.set(s, ev);
    }

    const fallbackColorId = colorIds[0]!;
    const colorNameToId = new Map(
      colorEntries.map((c, i) => [c.name.trim().toLowerCase(), colorIds[i]!] as const),
    );

    const keptVariantIds = new Set<number>();

    for (const vrow of variantsPayload) {
      const sku = vrow.sku.trim();
      const colorId = resolveLegacyVariantColorId(vrow, optionsPayload, colorNameToId, fallbackColorId);
      const size = resolveLegacyVariantSize(vrow, optionsPayload);
      const priceOverride =
        vrow.price_override != null && vrow.price_override > 0 ? vrow.price_override.toFixed(2) : null;

      const match = existingBySku.get(sku);
      if (match) {
        await tx
          .update(productVariants)
          .set({
            colorId,
            size,
            stock: vrow.stock_quantity,
            stockQuantity: vrow.stock_quantity,
            sku,
            priceOverride,
          })
          .where(eq(productVariants.id, match.id));
        keptVariantIds.add(match.id);
      } else {
        const [ins] = await tx
          .insert(productVariants)
          .values({
            productId: validProductId,
            colorId,
            size,
            stock: vrow.stock_quantity,
            stockQuantity: vrow.stock_quantity,
            sku,
            priceOverride,
          })
          .returning({ id: productVariants.id });
        keptVariantIds.add(ins.id);
      }
    }

    const orphanIds = existingVariants.map((v) => v.id).filter((id) => !keptVariantIds.has(id));
    if (orphanIds.length > 0) {
      await tx.delete(productVariants).where(inArray(productVariants.id, orphanIds));
    }

    if (hasVariants && optionsPayload.length > 0) {
      const optionIds: number[] = [];
      for (let oi = 0; oi < optionsPayload.length; oi++) {
        const o = optionsPayload[oi]!;
        const [row] = await tx
          .insert(productOptions)
          .values({
            productId: validProductId,
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

      const skuToVariantId = new Map<string, number>();
      const finalRows = await tx
        .select({ id: productVariants.id, sku: productVariants.sku })
        .from(productVariants)
        .where(eq(productVariants.productId, validProductId));
      for (const fr of finalRows) {
        if (fr.sku?.trim()) skuToVariantId.set(fr.sku.trim(), fr.id);
      }

      for (const vrow of variantsPayload) {
        const vid = skuToVariantId.get(vrow.sku.trim());
        if (vid == null) {
          throw new Error(`Missing variant row after upsert for SKU ${vrow.sku}`);
        }
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
            productVariantId: vid,
            productOptionValueId: optValId,
          });
        }
      }
    }

    await tx.delete(productCollections).where(eq(productCollections.productId, validProductId));
    if (collectionIds.length > 0) {
      await tx.insert(productCollections).values(
        collectionIds.map((collectionId) => ({
          productId: validProductId,
          collectionId,
        })),
      );
    }

    await tx.delete(productAttributeValues).where(eq(productAttributeValues.productId, validProductId));
    if (attributeValueIds.length > 0) {
      await tx.insert(productAttributeValues).values(
        attributeValueIds.map((attributeValueId) => ({
          productId: validProductId,
          attributeValueId,
        })),
      );
    }
  });

  const afterRows = await db
    .select({ sku: productVariants.sku, stockQuantity: productVariants.stockQuantity })
    .from(productVariants)
    .where(eq(productVariants.productId, validProductId));
  const afterStockBySku = new Map<string, number>();
  for (const r of afterRows) {
    if (r.sku?.trim()) {
      afterStockBySku.set(r.sku.trim(), r.stockQuantity ?? 0);
    }
  }

  const stockChanges: { sku: string; previous: number; next: number }[] = [];
  const allSkus = new Set([...beforeStockBySku.keys(), ...afterStockBySku.keys()]);
  for (const sku of allSkus) {
    const previous = beforeStockBySku.get(sku) ?? 0;
    const next = afterStockBySku.get(sku) ?? 0;
    if (previous !== next) {
      stockChanges.push({ sku, previous, next });
    }
  }

  if (stockChanges.length > 0) {
    auditLog({
      userId,
      action: "stock.override",
      target: String(validProductId),
      details: { productId: validProductId, changes: stockChanges },
    });
  }
  auditLog({ userId, action: "product.update", target: String(validProductId), details: { name } });
  return {};
}
