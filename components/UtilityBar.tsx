"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MosaikLocale } from "@/lib/i18n-locales";
import { MOSAIK_LOCALES } from "@/lib/i18n-locales";

export type SortOption =
  | "recommended"
  | "newest"
  | "price-low"
  | "price-high"
  | "name-asc"
  | "name-desc";

const SORT_OPTION_KEYS: Record<SortOption, string> = {
  recommended: "sortRecommended",
  newest: "sortNewest",
  "price-low": "sortPriceLow",
  "price-high": "sortPriceHigh",
  "name-asc": "sortNameAsc",
  "name-desc": "sortNameDesc",
};

const LOCALE_ORDER: MosaikLocale[] = [...MOSAIK_LOCALES];

const LOCALE_LABEL_KEYS: Record<MosaikLocale, string> = {
  en: "localeEn",
  fr: "localeFr",
  ar: "localeAr",
};

interface UtilityBarProps {
  /** Opens the mobile filter overlay (`md` and below). */
  onMobileFiltersOpen: () => void;
  /** Toggles the inline filter sidebar (`md` and above). */
  onDesktopFiltersToggle: () => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function UtilityBar({
  onMobileFiltersOpen,
  onDesktopFiltersToggle,
  sort,
  onSortChange,
}: UtilityBarProps) {
  const t = useTranslations("UtilityBar");
  const locale = useLocale() as MosaikLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [localePending, startLocaleTransition] = useTransition();

  const sortLabel = (opt: SortOption) => t(SORT_OPTION_KEYS[opt]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 ps-6 pe-6 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMobileFiltersOpen}
          className="md:hidden text-xs font-medium uppercase tracking-[0.2em] text-foreground hover:opacity-70 transition-opacity"
        >
          {t("filters")}
        </button>
        <button
          type="button"
          onClick={onDesktopFiltersToggle}
          className="hidden md:inline text-xs font-medium uppercase tracking-[0.2em] text-foreground hover:opacity-70 transition-opacity"
        >
          {t("filters")}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
        <Select
          value={locale}
          disabled={localePending}
          onValueChange={(next) => {
            const loc = next as MosaikLocale;
            startLocaleTransition(() => {
              router.replace(pathname, { locale: loc });
            });
          }}
        >
          <SelectTrigger
            aria-label={t("language")}
            className="min-w-0 w-auto sm:min-w-[140px] border-0 shadow-none text-xs font-medium uppercase tracking-[0.2em] h-auto py-1"
          >
            <SelectValue placeholder={t("language")} />
          </SelectTrigger>
          <SelectContent>
            {LOCALE_ORDER.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {t(LOCALE_LABEL_KEYS[loc])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(v) => onSortChange(v as SortOption)}
        >
          <SelectTrigger className="min-w-0 w-auto sm:min-w-[200px] border-0 shadow-none text-xs font-medium uppercase tracking-[0.2em] h-auto py-1">
            <SelectValue>
              {t("sortPrefix")} {sortLabel(sort)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_OPTION_KEYS) as SortOption[]).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {sortLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
