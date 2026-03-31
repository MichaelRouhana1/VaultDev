import { db } from "@/db";
import { storefrontExchangeRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_EUR_PER_USD,
  DEFAULT_LBP_PER_USD,
  type ExchangeRatesPayload,
} from "@/lib/storefront-currency";

export async function getStorefrontExchangeRatesFromDb(): Promise<ExchangeRatesPayload> {
  try {
    const row = await db
      .select()
      .from(storefrontExchangeRates)
      .where(eq(storefrontExchangeRates.id, 1))
      .limit(1);
    if (!row[0]) {
      return { eurPerUsd: DEFAULT_EUR_PER_USD, lbpPerUsd: DEFAULT_LBP_PER_USD };
    }
    const eur = parseFloat(String(row[0].eurPerUsd));
    const lbp = parseFloat(String(row[0].lbpPerUsd));
    return {
      eurPerUsd: Number.isFinite(eur) && eur > 0 ? eur : DEFAULT_EUR_PER_USD,
      lbpPerUsd: Number.isFinite(lbp) && lbp > 0 ? lbp : DEFAULT_LBP_PER_USD,
    };
  } catch {
    return { eurPerUsd: DEFAULT_EUR_PER_USD, lbpPerUsd: DEFAULT_LBP_PER_USD };
  }
}
