import { redirect } from "next/navigation";

/** Legacy URL — shopping bag lives at `/bag`. */
export default async function CartLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.tab;
  const tab = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (tab) {
    redirect(`/bag?tab=${encodeURIComponent(tab)}`);
  }
  redirect("/bag");
}
