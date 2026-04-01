"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Slider } from "@/components/ui/slider";
import { sortSizes, cn } from "@/lib/utils";

/** Shop listing sort: only price ascending / descending (URL `?sort=price-low` | `price-high`). */
export type ShopSortOption = "price-low" | "price-high";

export interface FilterState {
  priceMin: number;
  priceMax: number;
  size: string[];
  color: string[];
  mainCategory: string[];
}

export type ShopFilterPanelContext = "all" | "main";

export interface AttributeFilterSection {
  name: string;
  values: { slug: string; label: string }[];
}

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];
const COLOR_OPTIONS = [
  "Black",
  "White",
  "Indigo",
  "Charcoal",
  "Camel",
  "Navy",
  "Grey",
  "Blue",
  "Light Blue",
];

export interface FilterPanelContentProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  priceBounds: { min: number; max: number };
  sort: ShopSortOption;
  onSortChange: (value: ShopSortOption) => void;
  /** False when the shop is already scoped to one main category (e.g. `?cat=jeans`). */
  showMainCategorySection: boolean;
  mainCategories?: { value: string; label: string }[];
  attributeSections?: AttributeFilterSection[];
  /** When set, Size chips are limited to these variant sizes (listing context). Omit for legacy static list. */
  variantSizeOptions?: string[];
  /** When set, Color chips use these product color names (listing context). Omit for legacy static list. */
  productColorOptions?: string[];
  /** Selected value slugs per attribute group name (e.g. `{ Fit: ["baggy"] }`). Client-only shop filtering. */
  selectedAttributes?: Record<string, string[]>;
  onToggleAttribute?: (attributeName: string, slug: string) => void;
  /** Mobile drawer close control */
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
  /** Desktop inline sidebar: hide duplicate "Filters" heading (toolbar already shows Filters). */
  hideTitle?: boolean;
}

function SortBySection({
  sort,
  onSortChange,
}: {
  sort: ShopSortOption;
  onSortChange: (value: ShopSortOption) => void;
}) {
  const t = useTranslations("FilterPanel");
  const options: { value: ShopSortOption; msg: "sortPriceLowToHigh" | "sortPriceHighToLow" }[] = [
    { value: "price-low", msg: "sortPriceLowToHigh" },
    { value: "price-high", msg: "sortPriceHighToLow" },
  ];
  return (
    <div className="mb-8">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground mb-4">{t("sortByHeading")}</h3>
      <div className="flex flex-col gap-3 items-stretch">
        {options.map(({ value, msg }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSortChange(value)}
            className={cn(
              "text-left text-xs font-normal uppercase tracking-[0.15em] transition-colors py-0.5",
              sort === value ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground/80",
            )}
          >
            {t(msg)}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: string; label: string }[] | string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground mb-4">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={`rounded-none px-4 py-2 text-xs font-normal uppercase tracking-[0.15em] transition-colors ${
                selected.includes(value)
                  ? "bg-foreground text-background dark:bg-background dark:text-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PriceRangeSection({
  bounds,
  valueMin,
  valueMax,
  onChange,
}: {
  bounds: { min: number; max: number };
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const t = useTranslations("FilterPanel");
  const range = bounds.max - bounds.min || 1;
  const step = Math.max(0.01, range / 100);
  const clampedMin = Math.max(bounds.min, Math.min(bounds.max, valueMin));
  const clampedMax = Math.max(bounds.min, Math.min(bounds.max, valueMax));
  const [lo, hi] = clampedMin <= clampedMax ? [clampedMin, clampedMax] : [clampedMax, clampedMin];

  return (
    <div className="mb-8">
      <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground mb-4">{t("priceRangeHeading")}</h3>

      <div className="w-full min-h-[3.5rem] py-4 md:min-h-0 md:py-2">
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={[lo, hi]}
          minStepsBetweenThumbs={0}
          onValueChange={([newMin, newMax]) => {
            let finalMin = newMin;
            let finalMax = newMax;

            if (newMin !== lo && newMax !== hi) {
              if (newMin === hi) {
                finalMin = hi;
                finalMax = hi;
              } else if (newMax === lo) {
                finalMin = lo;
                finalMax = lo;
              }
            }

            onChange(finalMin, finalMax);
          }}
          aria-label={t("priceRangeHeading")}
          className="w-full"
        />
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>${lo.toFixed(0)}</span>
        <span>${hi.toFixed(0)}</span>
      </div>
    </div>
  );
}

export function FilterPanelContent({
  filters,
  onFiltersChange,
  priceBounds,
  sort,
  onSortChange,
  showMainCategorySection,
  mainCategories = [],
  attributeSections = [],
  variantSizeOptions,
  productColorOptions,
  selectedAttributes = {},
  onToggleAttribute,
  showCloseButton = false,
  onClose,
  className = "",
  hideTitle = false,
}: FilterPanelContentProps) {
  const sections = useMemo(() => attributeSections ?? [], [attributeSections]);

  const sortedSizeOptions = useMemo(
    () => sortSizes([...(variantSizeOptions ?? SIZE_OPTIONS)]),
    [variantSizeOptions],
  );

  const toggleScalar = (key: "size" | "color") => (value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  const toggleMainCategory = (value: string) => {
    const current = filters.mainCategory;
    const nextMain = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, mainCategory: nextMain });
  };

  const setPriceRange = (priceMin: number, priceMax: number) => {
    onFiltersChange({ ...filters, priceMin, priceMax });
  };

  const showMainSection = showMainCategorySection && mainCategories.length > 0;
  const mainOptionsForUi = mainCategories.map((m) => ({ value: m.value, label: m.label }));

  return (
    <div className={`relative ${className}`}>
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 text-foreground hover:opacity-60"
          aria-label="Close filters"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {!hideTitle && (
        <h2 className="pt-6 text-sm font-medium uppercase tracking-[0.2em] text-foreground mb-8 pr-8 md:pr-0">
          Filters
        </h2>
      )}
      <SortBySection sort={sort} onSortChange={onSortChange} />
      <PriceRangeSection
        bounds={priceBounds}
        valueMin={filters.priceMin}
        valueMax={filters.priceMax}
        onChange={setPriceRange}
      />
      {showMainSection && (
        <FilterSection
          title="Categories"
          options={mainOptionsForUi}
          selected={filters.mainCategory}
          onToggle={toggleMainCategory}
        />
      )}
      {sections.map((section) =>
        section.values.length > 0 && onToggleAttribute ? (
          <FilterSection
            key={section.name}
            title={section.name}
            options={section.values.map((v) => ({ value: v.slug, label: v.label }))}
            selected={selectedAttributes[section.name] ?? []}
            onToggle={(slug) => onToggleAttribute(section.name, slug)}
          />
        ) : null,
      )}
      {sortedSizeOptions.length > 0 && (
        <FilterSection
          title="Size"
          options={sortedSizeOptions}
          selected={filters.size}
          onToggle={toggleScalar("size")}
        />
      )}
      {(productColorOptions === undefined ? COLOR_OPTIONS.length > 0 : productColorOptions.length > 0) && (
        <FilterSection
          title="Color"
          options={(productColorOptions ?? COLOR_OPTIONS).map((c) => ({
            value: c,
            label: c.toUpperCase(),
          }))}
          selected={filters.color}
          onToggle={toggleScalar("color")}
        />
      )}
    </div>
  );
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  priceBounds: { min: number; max: number };
  sort: ShopSortOption;
  onSortChange: (value: ShopSortOption) => void;
  showMainCategorySection: boolean;
  mainCategories?: { value: string; label: string }[];
  attributeSections?: AttributeFilterSection[];
  variantSizeOptions?: string[];
  productColorOptions?: string[];
  selectedAttributes?: Record<string, string[]>;
  onToggleAttribute?: (attributeName: string, slug: string) => void;
}

/** Full-screen slide-in filter drawer for viewports below `md`. Hidden from `md` up (desktop uses inline sidebar in ShopClient). */
export function FilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  priceBounds,
  sort,
  onSortChange,
  showMainCategorySection,
  mainCategories = [],
  attributeSections = [],
  variantSizeOptions,
  productColorOptions,
  selectedAttributes = {},
  onToggleAttribute,
}: FilterPanelProps) {
  const t = useTranslations("FilterPanel");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const main = document.getElementById("main-content");

    const syncMobileOverlay = () => {
      if (mq.matches) {
        document.body.style.overflow = "";
        if (main) {
          main.removeAttribute("inert");
          main.style.removeProperty("pointer-events");
        }
        return;
      }
      document.body.style.overflow = isOpen ? "hidden" : "";
      if (main) {
        if (isOpen) {
          main.setAttribute("inert", "");
          main.style.pointerEvents = "none";
        } else {
          main.removeAttribute("inert");
          main.style.removeProperty("pointer-events");
        }
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen || mq.matches) return;
      onClose();
    };

    syncMobileOverlay();
    if (isOpen) document.addEventListener("keydown", onEsc);
    mq.addEventListener("change", syncMobileOverlay);

    return () => {
      document.removeEventListener("keydown", onEsc);
      mq.removeEventListener("change", syncMobileOverlay);
      document.body.style.overflow = "";
      if (main) {
        main.removeAttribute("inert");
        main.style.removeProperty("pointer-events");
      }
    };
  }, [isOpen, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="md:hidden">
      <div
        className={`fixed inset-0 z-[9998] bg-black/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-0 z-[9999] flex h-[100dvh] min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden overscroll-y-contain bg-background transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal={isOpen}
        aria-label={t("filtersHeading")}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 bg-background px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground">{t("filtersHeading")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 -m-2 text-foreground hover:opacity-60"
            aria-label={t("closeDrawerAria")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6">
          <FilterPanelContent
            filters={filters}
            onFiltersChange={onFiltersChange}
            priceBounds={priceBounds}
            sort={sort}
            onSortChange={onSortChange}
            showMainCategorySection={showMainCategorySection}
            mainCategories={mainCategories}
            attributeSections={attributeSections}
            variantSizeOptions={variantSizeOptions}
            productColorOptions={productColorOptions}
            selectedAttributes={selectedAttributes}
            onToggleAttribute={onToggleAttribute}
            hideTitle
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
