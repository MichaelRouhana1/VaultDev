import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Legacy URL — shopping bag lives at `/bag`. */
export default async function CartLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const locale = await getLocale();
  const sp = await searchParams;
  const raw = sp.tab;
  const tab = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (tab) {
    redirect({ href: `/bag?tab=${encodeURIComponent(tab)}`, locale });
  }
  redirect({ href: "/bag", locale });
}
