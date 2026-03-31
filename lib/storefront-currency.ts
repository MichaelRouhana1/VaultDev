/**
 * Storefront display currency. Product DB prices are treated as USD; conversion is illustrative only.
 */
export type StorefrontCurrency = "USD" | "EUR" | "LBP";

export const STOREFRONT_CURRENCIES: readonly StorefrontCurrency[] = ["USD", "EUR", "LBP"] as const;

export const STOREFRONT_CURRENCY_STORAGE_KEY = "mosaik_storefront_currency";

/** Units of target currency per 1 USD (hardcoded). */
export const USD_TO_TARGET_RATE: Record<StorefrontCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  LBP: 89_500,
};

export function isStorefrontCurrency(v: string): v is StorefrontCurrency {
  return v === "USD" || v === "EUR" || v === "LBP";
}

export function parseUsdAmount(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

export function convertUsdToCurrency(usdAmount: number, currency: StorefrontCurrency): number {
  return usdAmount * USD_TO_TARGET_RATE[currency];
}

export function formatConvertedAmount(amountInTarget: number, currency: StorefrontCurrency): string {
  switch (currency) {
    case "USD":
      return `$${amountInTarget.toFixed(2)}`;
    case "EUR":
      return `€${amountInTarget.toFixed(2)}`;
    case "LBP":
      return `L£${Math.round(amountInTarget).toLocaleString("en-US")}`;
    default:
      return `$${amountInTarget.toFixed(2)}`;
  }
}

/** Format a catalog/cart value stored in USD for the active display currency. */
export function formatPriceFromUsd(usdInput: string | number, currency: StorefrontCurrency): string {
  const converted = convertUsdToCurrency(parseUsdAmount(usdInput), currency);
  return formatConvertedAmount(converted, currency);
}
