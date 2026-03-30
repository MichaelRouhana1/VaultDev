"use server";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productPageCopy } from "@/db/schema";
import { DEFAULT_PDP_RETURNS, DEFAULT_PDP_SHIPPING_DELIVERY } from "@/lib/product-page-defaults";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";
import { z } from "zod";

export type ProductPageAccordionResolved = {
  shippingDelivery: string;
  returnsText: string;
};

const storeSchema = z.enum(["streetwear", "formal"]);

const copySchema = z.object({
  shippingDelivery: z.string().max(12_000),
  returnsText: z.string().max(12_000),
});

function resolveRow(row: {
  shippingDelivery: string | null;
  returnsText: string | null;
} | undefined): ProductPageAccordionResolved {
  const ship = row?.shippingDelivery?.trim();
  const ret = row?.returnsText?.trim();
  return {
    shippingDelivery: ship || DEFAULT_PDP_SHIPPING_DELIVERY,
    returnsText: ret || DEFAULT_PDP_RETURNS,
  };
}

/** Resolved copy for storefront PDP accordion (per listing store). */
export const getProductPageAccordionCopy = cache(
  async (storeType: "streetwear" | "formal"): Promise<ProductPageAccordionResolved> => {
    const st = storeSchema.parse(storeType);
    const [row] = await db
      .select()
      .from(productPageCopy)
      .where(eq(productPageCopy.storeType, st))
      .limit(1);
    return resolveRow(row);
  },
);

export async function saveProductPageAccordionCopy(
  storeType: unknown,
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const gate = await requireAdminAction({ auditTarget: "product-page-copy:save" });
  if (!gate.authorized) {
    return { success: false, error: gate.response.error };
  }

  const stParsed = storeSchema.safeParse(storeType);
  const dataParsed = copySchema.safeParse(input);
  if (!stParsed.success) return { success: false, error: "Invalid store" };
  if (!dataParsed.success) return { success: false, error: "Invalid content" };

  const st = stParsed.data;
  const { shippingDelivery, returnsText } = dataParsed.data;

  const [existing] = await db
    .select({ id: productPageCopy.id })
    .from(productPageCopy)
    .where(eq(productPageCopy.storeType, st))
    .limit(1);

  const payload = {
    descriptionExtra: null,
    shippingDelivery: shippingDelivery.trim() === "" ? null : shippingDelivery,
    returnsText: returnsText.trim() === "" ? null : returnsText,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(productPageCopy).set(payload).where(eq(productPageCopy.id, existing.id));
  } else {
    await db.insert(productPageCopy).values({
      storeType: st,
      ...payload,
    });
  }

  auditLog({
    userId: gate.userId,
    action: "product_page_copy.save",
    target: st,
    details: { fields: ["shippingDelivery", "returnsText"] },
  });

  return { success: true };
}
