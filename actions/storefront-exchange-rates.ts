"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { storefrontExchangeRates } from "@/db/schema";
import { requireAdminAction } from "@/lib/security";

export async function updateStorefrontExchangeRates(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const gate = await requireAdminAction({ auditTarget: "storefront.exchange_rates.update" });
  if (!gate.authorized) {
    return { error: gate.response.error };
  }

  const eurRaw = String(formData.get("eurPerUsd") ?? "").trim();
  const lbpRaw = String(formData.get("lbpPerUsd") ?? "").trim();
  const eur = parseFloat(eurRaw);
  const lbp = parseFloat(lbpRaw);

  if (!Number.isFinite(eur) || eur <= 0 || eur > 1_000) {
    return { error: "EUR per USD must be a positive number up to 1000." };
  }
  if (!Number.isFinite(lbp) || lbp <= 0 || lbp > 1e12) {
    return { error: "LBP per USD must be a positive number up to 1,000,000,000,000." };
  }

  await db
    .insert(storefrontExchangeRates)
    .values({
      id: 1,
      eurPerUsd: eur.toFixed(8),
      lbpPerUsd: lbp.toFixed(4),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: storefrontExchangeRates.id,
      set: {
        eurPerUsd: eur.toFixed(8),
        lbpPerUsd: lbp.toFixed(4),
        updatedAt: new Date(),
      },
    });

  revalidatePath("/", "layout");

  return { ok: true };
}
