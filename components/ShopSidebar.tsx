"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
/**
 * Legacy `/shop` route UI (category + sort). Storefront shop at `/[storeType]/shop` uses
 * `FilterPanel` / `FilterPanelContent` in `ShopClient` instead — not this component.
 */
const CATEGORIES = ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "OTHER"] as const;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
] as const;

export function ShopSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "all";
  const sort = searchParams.get("sort") ?? "newest";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "newest") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `/shop?${query}` : "/shop");
  }

  return (
    <aside className="w-64 shrink-0 space-y-6" aria-labelledby="shop-sidebar-heading">
      <h2 id="shop-sidebar-heading" className="sr-only">Shop Filters</h2>
      <div className="space-y-2">
        <h3 className="font-medium text-sm"><Label htmlFor="category-select">Category</Label></h3>
        <Select
          value={category}
          onValueChange={(value) => updateParams("category", value)}
        >
          <SelectTrigger id="category-select" className="w-full" aria-label="Select category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <h3 className="font-medium text-sm"><Label htmlFor="sort-select">Sort by</Label></h3>
        <Select value={sort} onValueChange={(value) => updateParams("sort", value)}>
          <SelectTrigger id="sort-select" className="w-full" aria-label="Select sort order">
            <SelectValue placeholder="Sort order" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}
