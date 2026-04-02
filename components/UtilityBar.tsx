"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type ShopGridViewMode = "default" | "compact";

interface UtilityBarProps {
  /** Opens the mobile filter overlay (`md` and below). */
  onMobileFiltersOpen: () => void;
  /** Toggles the inline filter sidebar (`md` and above). */
  onDesktopFiltersToggle: () => void;
  /** Shop grid density (+/−). Omitted when `totalResultCount` is set (search bar). */
  viewMode?: ShopGridViewMode;
  onViewModeChange?: (mode: ShopGridViewMode) => void;
  /** When set, replaces the view density controls with this count (e.g. search results). */
  totalResultCount?: number;
}

export function UtilityBar({
  onMobileFiltersOpen,
  onDesktopFiltersToggle,
  viewMode = "default",
  onViewModeChange,
  totalResultCount,
}: UtilityBarProps) {
  const t = useTranslations("UtilityBar");
  const showResultCount = typeof totalResultCount === "number";

  const toggleBtnClass = (active: boolean) =>
    cn(
      "inline-flex min-h-10 min-w-10 items-center justify-center px-3 py-2 text-2xl font-semibold leading-none tabular-nums transition-colors",
      active ? "text-foreground" : "text-muted-foreground opacity-50 hover:opacity-80",
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 w-full sm:px-5 sm:py-2.5 md:px-6 md:py-3">
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
      {showResultCount ? (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground tabular-nums shrink-0">
          {t("resultsFound", { count: totalResultCount })}
        </p>
      ) : (
        <div className="flex items-center gap-2 shrink-0" role="group" aria-label={t("viewGroupAria")}>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground">{t("viewLabel")}</span>
          <button
            type="button"
            aria-pressed={viewMode === "default"}
            aria-label={t("viewDefaultAria")}
            onClick={() => onViewModeChange?.("default")}
            className={toggleBtnClass(viewMode === "default")}
          >
            -
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "compact"}
            aria-label={t("viewCompactAria")}
            onClick={() => onViewModeChange?.("compact")}
            className={toggleBtnClass(viewMode === "compact")}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
