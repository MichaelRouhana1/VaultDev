"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { CategoryHeader } from "@/components/CategoryHeader";
import { UtilityBar } from "@/components/UtilityBar";
import {
  FilterPanel,
  FilterPanelContent,
  type FilterState,
  type ShopFilterPanelContext,
  type ShopSortOption,
  type AttributeFilterSection,
} from "@/components/FilterPanel";
import { cn, getProductBasePriceNumber } from "@/lib/utils";
import type { StorefrontProductResolved, ProductVariant, ProductColor } from "@/db/schema";
import type { ProductCategory } from "@/actions/categories";
import type { ProductCategoryFilterTags } from "@/actions/storefront-products";

const PRODUCTS_PER_PAGE = 12;
const VALID_LEGACY_CATEGORIES = ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "OTHER"] as const;

interface ShopClientProps {
  /** From URL on server render; client updates sort locally (no navigation) for instant reorder like other filters. */
  initialSort: ShopSortOption;
  products: (StorefrontProductResolved & { categorySlug?: string | null; images?: string[] })[];
  variantsByProductId: Record<number, ProductVariant[]>;
  colorsByProductId?: Record<number, ProductColor[]>;
  /** Attribute value slugs per product (for client-side facet filtering). */
  attributeSlugsByProductId: Record<number, string[]>;
  wishlistProductIds: number[];
  categoryLabel?: string | null;
  storeMainCategories: ProductCategory[];
  attributeSectionsForFilters: AttributeFilterSection[];
  /** Variant sizes with stock > 0 in the current listing context (store / category / search). */
  filterVariantSizes: string[];
  /** Distinct product color names in the current listing context. */
  filterProductColorNames: string[];
  shopFilterContext: ShopFilterPanelContext;
  categoryFilterTags: Record<number, ProductCategoryFilterTags>;
  storeType: string;
}

export function ShopClient({
  initialSort,
  products,
  variantsByProductId,
  colorsByProductId = {},
  attributeSlugsByProductId,
  wishlistProductIds,
  categoryLabel,
  storeMainCategories,
  attributeSectionsForFilters,
  filterVariantSizes,
  filterProductColorNames,
  shopFilterContext,
  categoryFilterTags,
  storeType,
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const categorySlug = searchParams.get("cat");

  const [sort, setSort] = useState<ShopSortOption>(initialSort);
  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "compact">("default");
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 500,
    size: [],
    color: [],
    mainCategory: [],
  });
  /** Attribute group name → selected value slugs (client-only; matches FilterPanel sections). */
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const priceInitialized = useRef(false);

  /** Parse base price once per product; reuse for bounds, filter, and sort (no parseFloat in sort comparator). */
  const productRows = useMemo(
    () =>
      products.map((p) => ({
        product: p,
        basePrice: getProductBasePriceNumber(p),
      })),
    [products],
  );

  const priceBounds = useMemo(() => {
    if (productRows.length === 0) return { min: 0, max: 500 };
    const prices = productRows.map((r) => r.basePrice);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)) || 500,
    };
  }, [productRows]);

  useEffect(() => {
    priceInitialized.current = false;
  }, [category]);

  useEffect(() => {
    setSelectedAttributes({});
  }, [category, categorySlug, storeType]);

  useEffect(() => {
    if (products.length > 0 && priceBounds.max > 0 && !priceInitialized.current) {
      priceInitialized.current = true;
      setFilters((prev) => ({
        ...prev,
        priceMin: priceBounds.min,
        priceMax: priceBounds.max,
      }));
    }
  }, [products.length, priceBounds.min, priceBounds.max]);

  const handleSortChange = (value: ShopSortOption) => {
    setSort(value);
  };

  const toggleAttribute = useCallback((attributeName: string, slug: string) => {
    const trimmed = slug.trim();
    if (!trimmed) return;
    setSelectedAttributes((prev) => {
      const current = prev[attributeName] ?? [];
      const has = current.some((s) => s.toLowerCase() === trimmed.toLowerCase());
      const nextGroup = has
        ? current.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())
        : [...current, trimmed];
      const next = { ...prev };
      if (nextGroup.length === 0) {
        delete next[attributeName];
      } else {
        next[attributeName] = nextGroup;
      }
      return next;
    });
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = [...productRows];

    const priceMin = filters.priceMin ?? 0;
    const priceMax = filters.priceMax ?? Infinity;
    list = list.filter(({ basePrice }) => basePrice >= priceMin && basePrice <= priceMax);

    if (filters.mainCategory.length > 0) {
      list = list.filter(({ product: p }) => {
        const t = categoryFilterTags[p.id];
        return t != null && filters.mainCategory.includes(t.mainSlug);
      });
    }

    if (filters.size.length > 0) {
      list = list.filter(({ product: p }) => {
        const variants = variantsByProductId[p.id] ?? [];
        const availableSizes = variants.filter((v) => v.stock > 0).map((v) => v.size);
        return filters.size.some((s) => availableSizes.includes(s));
      });
    }

    if (filters.color.length > 0) {
      list = list.filter(({ product: p }) => {
        const cols = colorsByProductId[p.id] ?? [];
        const namesLower = cols.map((c) => c.name.toLowerCase());
        return filters.color.some((sel) => namesLower.includes(sel.toLowerCase()));
      });
    }

    for (const section of attributeSectionsForFilters) {
      const selected = selectedAttributes[section.name] ?? [];
      if (selected.length === 0) continue;
      const selectedLower = selected.map((s) => s.trim().toLowerCase()).filter(Boolean);
      list = list.filter(({ product: p }) => {
        const productSlugs = (attributeSlugsByProductId[p.id] ?? []).map((s) => s.trim().toLowerCase());
        return selectedLower.some((sel) => productSlugs.includes(sel));
      });
    }

    if (sort === "price-low") {
      list.sort((a, b) => a.basePrice - b.basePrice);
    } else {
      list.sort((a, b) => b.basePrice - a.basePrice);
    }

    return list.map(({ product }) => product);
  }, [
    productRows,
    variantsByProductId,
    colorsByProductId,
    attributeSlugsByProductId,
    filters,
    selectedAttributes,
    attributeSectionsForFilters,
    sort,
    categoryFilterTags,
  ]);

  const visibleProducts = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;

  const loadMore = () => {
    setVisibleCount((n) => n + PRODUCTS_PER_PAGE);
  };

  const validCategory =
    category && VALID_LEGACY_CATEGORIES.includes(category as (typeof VALID_LEGACY_CATEGORIES)[number])
      ? category
      : null;

  const mainCategoryOptions = useMemo(
    () => storeMainCategories.map((c) => ({ value: c.slug, label: c.label })),
    [storeMainCategories],
  );

  const showMainCategorySection = useMemo(() => {
    const browsingMainCategory =
      Boolean(categorySlug && storeMainCategories.some((c) => c.slug === categorySlug));
    return shopFilterContext === "all" && storeMainCategories.length > 0 && !browsingMainCategory;
  }, [shopFilterContext, storeMainCategories, categorySlug]);

  const viewAllListing = !categorySlug && !validCategory;

  return (
    <div className="w-full min-h-screen bg-background">
      <CategoryHeader
        category={validCategory}
        categorySlug={categorySlug}
        categoryLabel={categoryLabel}
        viewAllListing={viewAllListing}
      />

      <div className="sticky top-14 z-30 bg-background">
        <UtilityBar
          onMobileFiltersOpen={() => setMobileFilterOpen(true)}
          onDesktopFiltersToggle={() => setDesktopFilterOpen((o) => !o)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
      <FilterPanel
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        priceBounds={priceBounds}
        sort={sort}
        onSortChange={handleSortChange}
        showMainCategorySection={showMainCategorySection}
        mainCategories={mainCategoryOptions}
        attributeSections={attributeSectionsForFilters}
        variantSizeOptions={filterVariantSizes}
        productColorOptions={filterProductColorNames}
        selectedAttributes={selectedAttributes}
        onToggleAttribute={toggleAttribute}
      />
      <div className="flex relative w-full items-start gap-x-4 px-4 pt-2 pb-5 sm:px-5 sm:pt-3 sm:pb-6 md:gap-x-6 md:px-6 md:pt-4 md:pb-8">
        <aside
          className={cn(
            "hidden md:block shrink-0 self-start transition-[width,opacity] duration-300 ease-in-out",
            desktopFilterOpen
              ? "no-scrollbar w-[250px] lg:w-[280px] opacity-100 sticky top-32 z-20 max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain border-r border-border"
              : "w-0 opacity-0 m-0 p-0 pointer-events-none overflow-hidden",
          )}
          aria-hidden={!desktopFilterOpen}
        >
          <div className="w-[250px] lg:w-[280px] pr-4 lg:pr-6 pb-2 pt-5">
            <FilterPanelContent
              hideTitle
              filters={filters}
              onFiltersChange={setFilters}
              priceBounds={priceBounds}
              sort={sort}
              onSortChange={handleSortChange}
              showMainCategorySection={showMainCategorySection}
              mainCategories={mainCategoryOptions}
              attributeSections={attributeSectionsForFilters}
              variantSizeOptions={filterVariantSizes}
              productColorOptions={filterProductColorNames}
              selectedAttributes={selectedAttributes}
              onToggleAttribute={toggleAttribute}
            />
          </div>
        </aside>
        <main className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
          {filteredAndSorted.length === 0 ? (
            <p className="text-center text-sm font-light text-muted-foreground py-16">No products match your filters.</p>
          ) : (
            <>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  viewMode === "compact" ? "grid-cols-3 md:grid-cols-6" : "grid-cols-2 md:grid-cols-4",
                  viewMode === "compact"
                    ? desktopFilterOpen
                      ? "gap-2 md:gap-3 lg:gap-4"
                      : "gap-2 md:gap-5 lg:gap-8"
                    : desktopFilterOpen
                      ? "gap-2 sm:gap-4 lg:gap-3"
                      : "gap-4 sm:gap-6 lg:gap-8",
                )}
              >
                {visibleProducts.map((product) => (
                  <div
                    key={product.id}
                    className="min-w-0 transition-all duration-300 ease-in-out"
                  >
                    <ProductCard
                      product={product}
                      variants={variantsByProductId[product.id] ?? []}
                      colors={colorsByProductId[product.id]}
                      inWishlist={wishlistProductIds.includes(product.id)}
                      isCompactView={viewMode === "compact"}
                    />
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-12">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="rounded-none px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-foreground border border-foreground hover:bg-foreground hover:text-background transition-colors duration-200"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
