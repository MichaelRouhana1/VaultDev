"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { checkValidatePromoLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const DEFAULT_SHIPPING_FEE = 5;

export type PromoDiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

/** Public storefront response from `validatePromoCode` — no internal DB ids. */
export type ValidatePromoCodeSuccess = {
  success: true;
  code: string;
  discountAmount: number;
  discountType: PromoDiscountType;
};

export type ValidatePromoCodeResult = ValidatePromoCodeSuccess | { success: false; error: string };

type InternalPromoValidation = {
  discountAmount: number;
  promoCodeId: number;
  code: string;
  discountType: PromoDiscountType;
  promo: typeof promoCodes.$inferSelect;
};

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

function computeDiscount(
  discountType: string,
  discountValue: number,
  cartSubtotal: number,
  shippingFee: number
): number {
  switch (discountType) {
    case "PERCENTAGE":
      return Math.min((cartSubtotal * discountValue) / 100, cartSubtotal);
    case "FIXED_AMOUNT":
      return Math.min(discountValue, cartSubtotal);
    case "FREE_SHIPPING":
      return shippingFee;
    default:
      return 0;
  }
}

async function validateAndGetPromo(
  client: DbClient,
  code: string,
  cartSubtotal: number,
  shippingFee: number
): Promise<InternalPromoValidation> {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error("Please enter a promo code");
  }

  const [promo] = await client
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.code, normalizedCode), eq(promoCodes.isActive, true)))
    .limit(1);

  if (!promo) {
    throw new Error("Invalid code");
  }

  if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
    throw new Error("Code expired");
  }

  if (promo.maxUses != null && (promo.currentUses ?? 0) >= promo.maxUses) {
    throw new Error("Usage limit reached");
  }

  const minOrder = parseFloat(String(promo.minOrderAmount ?? 0));
  if (cartSubtotal < minOrder) {
    throw new Error(`Minimum order amount not met ($${minOrder.toFixed(2)} required)`);
  }

  const discountValue = parseFloat(String(promo.discountValue ?? 0));
  const discountAmount = Math.round(
    computeDiscount(promo.discountType, discountValue, cartSubtotal, shippingFee) * 100
  ) / 100;

  return {
    discountAmount,
    promoCodeId: promo.id,
    code: promo.code,
    discountType: promo.discountType as PromoDiscountType,
    promo,
  };
}

/**
 * Validates a promo code and returns the discount amount.
 * Throws an error with a user-friendly message if validation fails.
 */
export async function validatePromoCode(
  code: string,
  cartSubtotal: number,
  shippingFee: number = DEFAULT_SHIPPING_FEE
): Promise<ValidatePromoCodeResult> {
  const validatedCode = z.string().min(1).parse(code);
  const validatedCartSubtotal = z.number().min(0).parse(cartSubtotal);
  const validatedShippingFee = z.number().min(0).parse(shippingFee);

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const limit = await checkValidatePromoLimit(ip);
  if (!limit.allowed) {
    logger.warn("Rate limit exceeded for validatePromo", { ip });
    return { success: false, error: "Too many requests. Please wait before trying again." };
  }
  const result = await validateAndGetPromo(db, validatedCode, validatedCartSubtotal, validatedShippingFee);
  return {
    success: true,
    code: result.code,
    discountAmount: result.discountAmount,
    discountType: result.discountType,
  };
}

/**
 * Validates promo inside a transaction and returns discount info.
 * Used by placeOrder to prevent race conditions.
 */
export async function validatePromoInTransaction(
  tx: DbClient,
  code: string,
  cartSubtotal: number,
  shippingFee: number
): Promise<{ discountAmount: number; promoCodeId: number }> {
  const validatedCode = z.string().min(1).parse(code);
  const validatedCartSubtotal = z.number().min(0).parse(cartSubtotal);
  const validatedShippingFee = z.number().min(0).parse(shippingFee);

  const result = await validateAndGetPromo(tx, validatedCode, validatedCartSubtotal, validatedShippingFee);
  return {
    discountAmount: result.discountAmount,
    promoCodeId: result.promoCodeId,
  };
}

// --- Admin CRUD ---

export async function createPromoCode(formData: FormData): Promise<{ success?: boolean; error?: string; id?: number }> {
  const promoSchema = z.object({
    code: z.string().min(1).trim().toUpperCase(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
    discountValue: z.number().min(0),
    minOrderAmount: z.number().min(0),
    maxUses: z.number().int().positive().nullable(),
    expiresAt: z.date().nullable(),
  });

  const codeRaw = (formData.get("code") as string)?.trim().toUpperCase();
  const discountTypeRaw = formData.get("discountType") as string;
  const discountValueRaw = parseFloat(String(formData.get("discountValue") ?? 0));
  const minOrderAmountRaw = parseFloat(String(formData.get("minOrderAmount") ?? 0));
  const maxUsesRawStr = formData.get("maxUses") as string;
  const maxUsesRaw = maxUsesRawStr?.trim() ? parseInt(maxUsesRawStr, 10) : null;
  const expiresAtRawStr = formData.get("expiresAt") as string;
  const expiresAtRaw = expiresAtRawStr?.trim() ? new Date(expiresAtRawStr) : null;

  const parsed = promoSchema.safeParse({
    code: codeRaw,
    discountType: discountTypeRaw,
    discountValue: discountValueRaw,
    minOrderAmount: minOrderAmountRaw,
    maxUses: maxUsesRaw,
    expiresAt: expiresAtRaw,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues[0]?.message || "Validation failed";
    logger.error("Create promo validation failed", undefined, { errorDetails, formData: Array.from(formData.entries()) });
    return { success: false, error: errorDetails };
  }

  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "promo.create" });
    redirect("/");
  }

  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = parsed.data;

  if (discountType !== "FREE_SHIPPING" && discountValue <= 0) {
    logger.error("Invalid discount value for promo code", undefined, { discountType, discountValue });
    return { success: false, error: "Valid discount value is required for this discount type" };
  }

  try {
    const [inserted] = await db
      .insert(promoCodes)
      .values({
        code,
        discountType: discountType as "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING",
        discountValue: (discountType === "FREE_SHIPPING" ? 0 : discountValue).toFixed(2),
        minOrderAmount: minOrderAmount.toFixed(2),
        maxUses,
        expiresAt,
      })
      .returning({ id: promoCodes.id });
    if (!inserted) return { error: "Failed to create promo code" };
    auditLog({ userId, action: "promo.create", target: String(inserted.id), details: { code } });
    return { id: inserted.id };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      logger.error("Promo code already exists", e, { code });
      return { success: false, error: "A promo code with this code already exists" };
    }
    logger.error("Failed to create promo code", e, { code });
    return { success: false, error: "Failed to create promo code" };
  }
}

export async function togglePromoStatus(id: number): Promise<{ error?: string }> {
  const validId = z.number().int().positive().parse(id);
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "promo.toggle_status" });
    redirect("/");
  }
  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, validId)).limit(1);
  if (!promo) return { error: "Promo not found" };
  await db
    .update(promoCodes)
    .set({ isActive: !promo.isActive })
    .where(eq(promoCodes.id, validId));
  auditLog({ userId, action: "promo.toggle_status", target: String(validId), details: { code: promo.code, isActive: !promo.isActive } });
  return {};
}

export async function deletePromoCode(id: number): Promise<{ error?: string }> {
  const validId = z.number().int().positive().parse(id);
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "promo.delete" });
    redirect("/");
  }
  const [promo] = await db.select({ code: promoCodes.code }).from(promoCodes).where(eq(promoCodes.id, validId)).limit(1);
  await db.delete(promoCodes).where(eq(promoCodes.id, validId));
  auditLog({ userId, action: "promo.delete", target: String(validId), details: promo ? { code: promo.code } : undefined });
  return {};
}
