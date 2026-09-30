import { z } from "zod";

export const PROMO_TOTAL_LIMIT_REACHED = "Usage limit reached";
export const PROMO_CUSTOMER_LIMIT_REACHED =
  "You have already used this code the maximum number of times";
export const PROMO_CUSTOMER_EMAIL_REQUIRED = "Enter your email to use this code";

const emailSchema = z.string().email();

export type PromoCustomer = {
  userId: string | null;
  email: string | null;
};

export type PromoUseLimits = {
  maxUses: number | null;
  currentUses: number;
  maxUsesPerCustomer: number | null;
  /** Orders this customer already placed with the code. Null when they cannot be identified. */
  customerOrderCount: number | null;
};

export function normalizePromoCustomer(input?: {
  userId?: string | null;
  email?: string | null;
}): PromoCustomer {
  const userId = input?.userId?.trim() || null;
  const emailRaw = input?.email?.trim().toLowerCase() ?? "";
  const email = emailSchema.safeParse(emailRaw).success ? emailRaw : null;
  return { userId, email };
}

/**
 * Returns a shopper-facing error when a code cannot be used, or null when it can.
 * Counts are per order. One bag is one use, however many items are in it.
 */
export function promoUseLimitError(limits: PromoUseLimits): string | null {
  if (limits.maxUses != null && limits.currentUses >= limits.maxUses) {
    return PROMO_TOTAL_LIMIT_REACHED;
  }
  if (limits.maxUsesPerCustomer == null) return null;
  if (limits.customerOrderCount == null) return PROMO_CUSTOMER_EMAIL_REQUIRED;
  if (limits.customerOrderCount >= limits.maxUsesPerCustomer) {
    return PROMO_CUSTOMER_LIMIT_REACHED;
  }
  return null;
}
