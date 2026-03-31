/**
 * Storefront display currency. Product DB prices are treated as USD; conversion is illustrative only.
 */
export type StorefrontCurrency = "USD" | "EUR" | "LBP";

export const STOREFRONT_CURRENCIES: readonly StorefrontCurrency[] = ["USD", "EUR", "LBP"] as const;

export const STOREFRONT_CURRENCY_STORAGE_KEY = "mosaik_storefront_currency";

/** Fallback when DB row is missing (matches seeded migration defaults). */
export const DEFAULT_EUR_PER_USD = 0.92;
export const DEFAULT_LBP_PER_USD = 89_500;

export type ExchangeRatesPayload = {
  eurPerUsd: number;
  lbpPerUsd: number;
};

/** Units of target currency per 1 USD (defaults; overridden by DB + `CurrencyContext`). */
export const USD_TO_TARGET_RATE: Record<StorefrontCurrency, number> = {
  USD: 1,
  EUR: DEFAULT_EUR_PER_USD,
  LBP: DEFAULT_LBP_PER_USD,
};

export function buildUsdToTargetMap(rates: ExchangeRatesPayload): Record<StorefrontCurrency, number> {
  return {
    USD: 1,
    EUR: rates.eurPerUsd,
    LBP: rates.lbpPerUsd,
  };
}

export function isStorefrontCurrency(v: string): v is StorefrontCurrency {
  return v === "USD" || v === "EUR" || v === "LBP";
}

export function parseUsdAmount(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

export function convertUsdToCurrency(
  usdAmount: number,
  currency: StorefrontCurrency,
  ratesMap: Record<StorefrontCurrency, number> = USD_TO_TARGET_RATE,
): number {
  return usdAmount * ratesMap[currency];
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
export function formatPriceFromUsd(
  usdInput: string | number,
  currency: StorefrontCurrency,
  ratesMap: Record<StorefrontCurrency, number> = USD_TO_TARGET_RATE,
): string {
  const converted = convertUsdToCurrency(parseUsdAmount(usdInput), currency, ratesMap);
  return formatConvertedAmount(converted, currency);
}
