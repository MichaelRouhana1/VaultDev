import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Absolute site URL for emails, redirects, and activation links (no trailing slash).
 * Prefer `NEXT_PUBLIC_APP_URL` in dev (e.g. http://localhost:3000); falls back to `VERCEL_URL` in production.
 */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "";
}

/** Product with price fields - supports both full Product and minimal shape */
export interface ProductWithPrice {
  price: string | number;
  salePrice?: string | number | null;
  saleStartsAt?: Date | string | null;
  saleEndsAt?: Date | string | null;
  isSaleActive?: boolean;
}

function parsePrice(val: string | number | null | undefined): number {
  if (val == null) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
}

function toDecimal(val: number): string {
  return val.toFixed(2);
}

/**
 * Returns the display price for a product based on active sale status.
 * Sale is active when: isSaleActive !== false, salePrice exists, salePrice > 0,
 * salePrice < price, and current date is within [saleStartsAt, saleEndsAt] if set.
 */
export function getProductDisplayPrice(product: ProductWithPrice): string {
  const price = parsePrice(product.price);
  const salePrice = product.salePrice != null ? parsePrice(product.salePrice) : null;

  if (salePrice == null || salePrice <= 0 || salePrice >= price) {
    return toDecimal(price);
  }

  if (product.isSaleActive === false) {
    return toDecimal(price);
  }

  const now = new Date();
  const startsAt = product.saleStartsAt
    ? new Date(product.saleStartsAt)
    : null;
  const endsAt = product.saleEndsAt ? new Date(product.saleEndsAt) : null;

  if (startsAt != null && now < startsAt) return toDecimal(price);
  if (endsAt != null && now > endsAt) return toDecimal(price);

  return toDecimal(salePrice);
}

/**
 * Returns whether the product currently has an active sale (for badges, etc.)
 */
export function isProductOnSale(product: ProductWithPrice): boolean {
  const price = parsePrice(product.price);
  const salePrice = product.salePrice != null ? parsePrice(product.salePrice) : null;
  if (salePrice == null || salePrice <= 0 || salePrice >= price || product.isSaleActive === false) {
    return false;
  }
  const now = new Date();
  const startsAt = product.saleStartsAt ? new Date(product.saleStartsAt) : null;
  const endsAt = product.saleEndsAt ? new Date(product.saleEndsAt) : null;
  if (startsAt != null && now < startsAt) return false;
  if (endsAt != null && now > endsAt) return false;
  return true;
}

/**
 * Returns the discount percentage (0-100) when on sale, or 0 otherwise.
 */
export function getProductDiscountPercent(product: ProductWithPrice): number {
  if (!isProductOnSale(product)) return 0;
  const price = parsePrice(product.price);
  const salePrice = parsePrice(product.salePrice);
  if (price <= 0) return 0;
  return Math.round((1 - salePrice / price) * 100);
}
