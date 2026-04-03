import type { ShopSortOption } from "@/components/FilterPanel";

/** Canonical key for shop listing URL state (must match server + client). */
export function shopListingNavKeyFromState(args: {
  categorySlug: string | null;
  sort: ShopSortOption;
  searchQuery: string;
}): string {
  return JSON.stringify({
    cat: args.categorySlug,
    sort: args.sort,
    q: args.searchQuery.trim(),
  });
}

export function shopListingNavKeyFromSearchParams(sp: { get: (name: string) => string | null }): string {
  const catRaw = sp.get("cat")?.trim() ?? "";
  const cat = catRaw.length > 0 ? catRaw : null;
  const sort: ShopSortOption = sp.get("sort") === "price-high" ? "price-high" : "price-low";
  const q = (sp.get("q") ?? "").trim();
  return JSON.stringify({ cat, sort, q });
}
