import { NextResponse } from "next/server";
import { getStorefrontExchangeRatesFromDb } from "@/lib/storefront-exchange-rates-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getStorefrontExchangeRatesFromDb();
  return NextResponse.json(rates, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
