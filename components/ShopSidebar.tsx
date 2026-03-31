"use client";

import { useTranslations } from "next-intl";
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

const CATEGORIES = ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "OTHER"] as const;
const CATEGORY_LABEL_KEYS: Record<(typeof CATEGORIES)[number], string> = {
  CLOTHING: "catClothing",
  SHOES: "catShoes",
  ACCESSORIES: "catAccessories",
  BAGS: "catBags",
  OTHER: "catOther",
};

const SORT_OPTIONS = [
  { value: "newest", labelKey: "sortNewest" as const },
  { value: "price-asc", labelKey: "sortPriceAsc" as const },
  { value: "price-desc", labelKey: "sortPriceDesc" as const },
  { value: "name-asc", labelKey: "sortNameAsc" as const },
  { value: "name-desc", labelKey: "sortNameDesc" as const },
] as const;

export function ShopSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("ShopSidebar");

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
      <h2 id="shop-sidebar-heading" className="sr-only">
        {t("srHeading")}
      </h2>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          <Label htmlFor="category-select">{t("category")}</Label>
        </h3>
        <Select value={category} onValueChange={(value) => updateParams("category", value)}>
          <SelectTrigger id="category-select" className="w-full" aria-label={t("categoryAria")}>
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(CATEGORY_LABEL_KEYS[cat] as "catClothing")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          <Label htmlFor="sort-select">{t("sortBy")}</Label>
        </h3>
        <Select value={sort} onValueChange={(value) => updateParams("sort", value)}>
          <SelectTrigger id="sort-select" className="w-full" aria-label={t("sortAria")}>
            <SelectValue placeholder={t("sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}
