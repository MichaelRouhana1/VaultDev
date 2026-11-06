"use server";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sectionSettings } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { requireAdminAction } from "@/lib/security";

const SETTING_KEY = "product-page-new-layout";
export type ProductPageLayout = "new" | "old";
type SaveResult = { layout: ProductPageLayout } | { error: string };

export const getProductPageLayout = cache(async (): Promise<ProductPageLayout> => {
  const [row] = await db
    .select({ useNew: sectionSettings.isVisible })
    .from(sectionSettings)
    .where(eq(sectionSettings.sectionKey, SETTING_KEY))
    .limit(1);

  // The public storefront uses the old layout until an admin opts in.
  return row?.useNew === true ? "new" : "old";
});

export async function updateProductPageLayout(
  _previous: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const gate = await requireAdminAction({ auditTarget: "product_page.layout.update" });
  if (!gate.authorized) return { error: gate.response.error };

  const layout = formData.get("layout");
  if (layout !== "new" && layout !== "old") return { error: "Choose New or Old." };

  const isVisible = layout === "new";
  await db
    .insert(sectionSettings)
    .values({ sectionKey: SETTING_KEY, isVisible })
    .onConflictDoUpdate({ target: sectionSettings.sectionKey, set: { isVisible } });

  auditLog({ userId: gate.userId, action: "product_page.layout.update", target: SETTING_KEY, details: { layout } });
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/(storefront)/[storeType]/product/[id]", "page");
  return { layout };
}
