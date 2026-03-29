"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption =
  | "recommended"
  | "newest"
  | "price-low"
  | "price-high"
  | "name-asc"
  | "name-desc";

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  newest: "Newest",
  "price-low": "Price: Low to High",
  "price-high": "Price: High to Low",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
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
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <button
        type="button"
        onClick={onMobileFiltersOpen}
        className="md:hidden text-xs font-medium uppercase tracking-[0.2em] text-foreground hover:opacity-70 transition-opacity"
      >
        Filters
      </button>
      <button
        type="button"
        onClick={onDesktopFiltersToggle}
        className="hidden md:inline text-xs font-medium uppercase tracking-[0.2em] text-foreground hover:opacity-70 transition-opacity"
      >
        Filters
      </button>
      <Select
        value={sort}
        onValueChange={(v) => onSortChange(v as SortOption)}
      >
        <SelectTrigger className="min-w-0 w-auto sm:min-w-[200px] border-0 shadow-none text-xs font-medium uppercase tracking-[0.2em] h-auto py-1">
          <SelectValue>Sort {SORT_LABELS[sort]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {SORT_LABELS[opt]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
