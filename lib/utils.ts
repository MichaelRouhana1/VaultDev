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

/**
 * URL-safe slug for `product_option_values.slug` (e.g. "US 9.5" → "us-9-5").
 * Uniqueness per option is enforced separately (append suffix if needed).
 */
export function slugifyOptionValue(value: string): string {
  const s = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "value";
}

/** Standard apparel sizes in display order (use 3XL not XXXL; 4XL/5XL for extended plus). */
const STANDARD_SIZE_ORDER = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "ONE SIZE",
] as const;

function normalizeStandardSizeToken(raw: string): string {
  let u = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (u === "XXXL") u = "3XL";
  if (u === "XXXXL") u = "4XL";
  if (u === "XXXXXL") u = "5XL";
  if (u === "OS" || u === "ONESIZE" || u === "ONE-SIZE") u = "ONE SIZE";
  return u;
}

type SizeSortBucket = { tier: 0 | 1 | 2; primary: number; secondary: string };

function sizeSortBucket(label: string): SizeSortBucket {
  const raw = label.trim();
  const std = normalizeStandardSizeToken(raw);
  const stdIdx = (STANDARD_SIZE_ORDER as readonly string[]).indexOf(std);
  if (stdIdx !== -1) {
    return { tier: 0, primary: stdIdx, secondary: raw };
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) {
      return { tier: 1, primary: n, secondary: raw };
    }
  }

  return { tier: 2, primary: 0, secondary: raw };
}

/**
 * Sort size labels for display: standard letters (XXS → 5XL, ONE SIZE), then numeric waist/length,
 * then remaining values alphabetically.
 */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ka = sizeSortBucket(a);
    const kb = sizeSortBucket(b);
    if (ka.tier !== kb.tier) return ka.tier - kb.tier;
    if (ka.tier === 0) return ka.primary - kb.primary;
    if (ka.tier === 1) return ka.primary - kb.primary;
    return ka.secondary.localeCompare(kb.secondary, undefined, { numeric: true, sensitivity: "base" });
  });
}
