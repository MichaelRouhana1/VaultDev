"use client";

import { useEffect, useMemo } from "react";

export interface FilterState {
  priceMin: number;
  priceMax: number;
  size: string[];
  color: string[];
  mainCategory: string[];
  subcategory: string[];
}

export type ShopFilterPanelContext = "all" | "main" | "sub";

export interface SubcategoryFilterOption {
  value: string;
  label: string;
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

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  priceBounds: { min: number; max: number };
  shopFilterContext: ShopFilterPanelContext;
  mainCategories?: { value: string; label: string }[];
  /** All store subcategories (independent of main category). */
  subcategories?: SubcategoryFilterOption[];
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
  const range = bounds.max - bounds.min || 1;
  const step = Math.max(0.01, range / 100);
  const clampedMin = Math.max(bounds.min, Math.min(bounds.max, valueMin));
  const clampedMax = Math.max(bounds.min, Math.min(bounds.max, valueMax));

  return (
    <div className="mb-8">
      <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground mb-4">Price Range</h3>
      <div className="space-y-6">
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Min: ${clampedMin.toFixed(0)}</label>
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={step}
            value={clampedMin}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(v, Math.max(v, clampedMax));
            }}
            className="w-full h-1.5 rounded-full bg-foreground/25 border border-border appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-1.5 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Max: ${clampedMax.toFixed(0)}</label>
          <input
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={step}
            value={clampedMax}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange(Math.min(v, clampedMin), v);
            }}
            className="w-full h-1.5 rounded-full bg-foreground/25 border border-border appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-1.5 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

export function FilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  priceBounds,
  shopFilterContext,
  mainCategories = [],
  subcategories = [],
}: FilterPanelProps) {
  const allSubs = useMemo(() => subcategories ?? [], [subcategories]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const toggleScalar = (key: "size" | "color") => (value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  };

  const toggleSubcategory = (value: string) => {
    const current = filters.subcategory;
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, subcategory: next });
  };

  const toggleMainCategory = (value: string) => {
    const current = filters.mainCategory;
    const nextMain = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFiltersChange({ ...filters, mainCategory: nextMain });
  };

  const setPriceRange = (priceMin: number, priceMax: number) => {
    onFiltersChange({ ...filters, priceMin, priceMax });
  };

  const showMainSection = shopFilterContext === "all" && mainCategories.length > 0;
  const showSubSection = allSubs.length > 0;

  const mainOptionsForUi = mainCategories.map((m) => ({ value: m.value, label: m.label }));
  const subOptionsForUi = allSubs.map((s) => ({ value: s.value, label: s.label }));

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[320px] max-w-[85vw] z-50 bg-background shadow-xl overflow-y-auto transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-label="Filters"
      >
        <div className="p-6 pt-16 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-foreground hover:opacity-60"
            aria-label="Close filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground mb-8">Filters</h2>
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
          {showSubSection && (
            <FilterSection
              title="Subcategories"
              options={subOptionsForUi}
              selected={filters.subcategory}
              onToggle={toggleSubcategory}
            />
          )}
          <FilterSection title="Size" options={SIZE_OPTIONS} selected={filters.size} onToggle={toggleScalar("size")} />
          <FilterSection title="Color" options={COLOR_OPTIONS} selected={filters.color} onToggle={toggleScalar("color")} />
        </div>
      </aside>
    </>
  );
}
