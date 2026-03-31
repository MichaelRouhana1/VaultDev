"use client";

import { useTranslations } from "next-intl";

const CATEGORY_KEYS: Record<string, { label: string; subtitle: string }> = {
  CLOTHING: { label: "clothingLabel", subtitle: "clothingSubtitle" },
  SHOES: { label: "shoesLabel", subtitle: "shoesSubtitle" },
  ACCESSORIES: { label: "accessoriesLabel", subtitle: "accessoriesSubtitle" },
  BAGS: { label: "bagsLabel", subtitle: "bagsSubtitle" },
  OTHER: { label: "otherLabel", subtitle: "otherSubtitle" },
};

const SLUG_KEYS: Record<string, { label: string; subtitle: string }> = {
  jeans: { label: "jeansLabel", subtitle: "jeansSubtitle" },
  trousers: { label: "trousersLabel", subtitle: "trousersSubtitle" },
  shirts: { label: "shirtsLabel", subtitle: "shirtsSubtitle" },
  tshirts: { label: "tshirtsLabel", subtitle: "tshirtsSubtitle" },
  hoodies: { label: "hoodiesLabel", subtitle: "hoodiesSubtitle" },
  jackets: { label: "jacketsLabel", subtitle: "jacketsSubtitle" },
};

interface CategoryHeaderProps {
  category: string | null;
  categorySlug?: string | null;
  categoryLabel?: string | null;
}

export function CategoryHeader({ category, categorySlug, categoryLabel }: CategoryHeaderProps) {
  const t = useTranslations("CategoryHeader");
  const slugConfig = categorySlug && !categoryLabel ? SLUG_KEYS[categorySlug] : null;
  const categoryConfig = category ? CATEGORY_KEYS[category] : null;
  const config = slugConfig ?? categoryConfig;
  const label = categoryLabel ?? (config ? t(config.label as "clothingLabel") : t("shopDefault"));
  const subtitle = config ? t(config.subtitle as "clothingSubtitle") : t("defaultSubtitle");

  return (
    <header className="border-b border-border px-6 py-12 text-center">
      <h1 className="text-3xl font-bold text-foreground">{label}</h1>
      <p className="mt-2 text-sm font-light text-muted-foreground">{subtitle}</p>
    </header>
  );
}
