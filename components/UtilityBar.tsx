"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type ShopGridViewMode = "default" | "compact";

interface UtilityBarProps {
  /** Opens the mobile filter overlay (`md` and below). */
  onMobileFiltersOpen: () => void;
  /** Toggles the inline filter sidebar (`md` and above). */
  onDesktopFiltersToggle: () => void;
  viewMode: ShopGridViewMode;
  onViewModeChange: (mode: ShopGridViewMode) => void;
}

export function UtilityBar({
  onMobileFiltersOpen,
  onDesktopFiltersToggle,
  viewMode,
  onViewModeChange,
}: UtilityBarProps) {
  const t = useTranslations("UtilityBar");

  const toggleBtnClass = (active: boolean) =>
    cn(
      "min-w-[2rem] px-2 py-1 text-sm font-medium tabular-nums transition-colors",
      active ? "text-foreground font-semibold" : "text-muted-foreground opacity-50 hover:opacity-80",
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 ps-6 pe-6 py-4 w-full">
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
      <div className="flex items-center gap-2 shrink-0" role="group" aria-label={t("viewGroupAria")}>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground">{t("viewLabel")}</span>
        <button
          type="button"
          aria-pressed={viewMode === "default"}
          aria-label={t("viewDefaultAria")}
          onClick={() => onViewModeChange("default")}
          className={toggleBtnClass(viewMode === "default")}
        >
          -
        </button>
        <button
          type="button"
          aria-pressed={viewMode === "compact"}
          aria-label={t("viewCompactAria")}
          onClick={() => onViewModeChange("compact")}
          className={toggleBtnClass(viewMode === "compact")}
        >
          +
        </button>
      </div>
    </div>
  );
}
