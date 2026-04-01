"use client";

import { useTranslations } from "next-intl";

const CATEGORY_KEYS: Record<string, "clothingLabel" | "shoesLabel" | "accessoriesLabel" | "bagsLabel" | "otherLabel"> = {
  CLOTHING: "clothingLabel",
  SHOES: "shoesLabel",
  ACCESSORIES: "accessoriesLabel",
  BAGS: "bagsLabel",
  OTHER: "otherLabel",
};

const SLUG_KEYS: Record<
  string,
  | "jeansLabel"
  | "trousersLabel"
  | "shirtsLabel"
  | "tshirtsLabel"
  | "hoodiesLabel"
  | "jacketsLabel"
> = {
  jeans: "jeansLabel",
  trousers: "trousersLabel",
  shirts: "shirtsLabel",
  tshirts: "tshirtsLabel",
  hoodies: "hoodiesLabel",
  jackets: "jacketsLabel",
};

interface CategoryHeaderProps {
  category: string | null;
  categorySlug?: string | null;
  categoryLabel?: string | null;
  /** Shop grid with no category filter (`/shop` without `?cat=`). */
  viewAllListing?: boolean;
}

export function CategoryHeader({
  category,
  categorySlug,
  categoryLabel,
  viewAllListing,
}: CategoryHeaderProps) {
  const t = useTranslations("CategoryHeader");

  if (viewAllListing) {
    return (
      <header className="px-3 py-3 text-center sm:px-4 sm:py-4 md:px-5">
        <h1 className="text-3xl font-bold text-foreground uppercase tracking-[0.2em]">{t("viewAllHeading")}</h1>
      </header>
    );
  }

  const slugKey = categorySlug && !categoryLabel ? SLUG_KEYS[categorySlug] : null;
  const categoryKey = category ? CATEGORY_KEYS[category] : null;
  const labelKey = slugKey ?? categoryKey;
  const label = categoryLabel ?? (labelKey ? t(labelKey) : t("shopDefault"));

  return (
    <header className="px-3 py-3 text-center sm:px-4 sm:py-4 md:px-5">
      <h1 className="text-3xl font-bold text-foreground">{label}</h1>
    </header>
  );
}
