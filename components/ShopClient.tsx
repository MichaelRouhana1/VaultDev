"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { CategoryHeader } from "@/components/CategoryHeader";
import { UtilityBar, type SortOption } from "@/components/UtilityBar";
import { ShopSearchBar } from "@/components/ShopSearchBar";
import {
  FilterPanel,
  FilterPanelContent,
  type FilterState,
  type ShopFilterPanelContext,
  type AttributeFilterSection,
} from "@/components/FilterPanel";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant, ProductColor } from "@/db/schema";
import type { ProductCategory } from "@/actions/categories";
import type { ProductCategoryFilterTags } from "@/actions/storefront-products";

const PRODUCTS_PER_PAGE = 12;
const VALID_LEGACY_CATEGORIES = ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "OTHER"] as const;

interface ShopClientProps {
  products: (Product & { categorySlug?: string | null })[];
  variantsByProductId: Record<number, ProductVariant[]>;
  colorsByProductId?: Record<number, ProductColor[]>;
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
  initialQuery?: string;
}

function parseAttributesParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

export function ShopClient({
  products,
  variantsByProductId,
  colorsByProductId = {},
  wishlistProductIds,
  categoryLabel,
  storeMainCategories,
  attributeSectionsForFilters,
  filterVariantSizes,
  filterProductColorNames,
  shopFilterContext,
  categoryFilterTags,
  storeType,
  initialQuery,
}: ShopClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const categorySlug = searchParams.get("cat");
  const sortParam = searchParams.get("sort") ?? "newest";

  const attributesQuery = searchParams.get("attributes");
  const selectedAttributeSlugs = useMemo(
    () => parseAttributesParam(attributesQuery),
    [attributesQuery],
  );

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>(
    ["recommended", "newest", "price-low", "price-high", "name-asc", "name-desc"].includes(sortParam)
      ? (sortParam as SortOption)
      : "newest",
  );
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 500,
    size: [],
    color: [],
    mainCategory: [],
  });
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const priceInitialized = useRef(false);

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 500 };
    const prices = products.map((p) => parseFloat(String(p.price)));
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)) || 500,
    };
  }, [products]);

  useEffect(() => {
    priceInitialized.current = false;
  }, [category]);

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

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "recommended" || value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const query = params.toString();
    const base = `/${storeType}/shop`;
    router.push(query ? `${base}?${query}` : base);
  };

  const toggleAttributeSlug = useCallback(
    (slug: string) => {
      const normalized = slug.trim().toLowerCase();
      const next = selectedAttributeSlugs.includes(normalized)
        ? selectedAttributeSlugs.filter((s) => s !== normalized)
        : [...selectedAttributeSlugs, normalized];
      const params = new URLSearchParams(searchParams.toString());
      if (next.length === 0) {
        params.delete("attributes");
      } else {
        params.set("attributes", next.join(","));
      }
      const query = params.toString();
      router.push(`/${storeType}/shop${query ? `?${query}` : ""}`);
    },
    [router, searchParams, storeType, selectedAttributeSlugs],
  );

  const filteredAndSorted = useMemo(() => {
    let list = [...products];

    const priceMin = filters.priceMin ?? 0;
    const priceMax = filters.priceMax ?? Infinity;
    list = list.filter((p) => {
      const price = parseFloat(String(p.price));
      return price >= priceMin && price <= priceMax;
    });

    if (filters.mainCategory.length > 0) {
      list = list.filter((p) => {
        const t = categoryFilterTags[p.id];
        return t != null && filters.mainCategory.includes(t.mainSlug);
      });
    }

    if (filters.size.length > 0) {
      list = list.filter((p) => {
        const variants = variantsByProductId[p.id] ?? [];
        const availableSizes = variants.filter((v) => v.stock > 0).map((v) => v.size);
        return filters.size.some((s) => availableSizes.includes(s));
      });
    }

    if (filters.color.length > 0) {
      list = list.filter((p) => {
        const cols = colorsByProductId[p.id] ?? [];
        const namesLower = cols.map((c) => c.name.toLowerCase());
        return filters.color.some((sel) => namesLower.includes(sel.toLowerCase()));
      });
    }

    if (sort === "recommended" || sort === "newest") {
      list.sort((a, b) => b.id - a.id);
    } else if (sort === "price-low") {
      list.sort((a, b) => parseFloat(String(a.price)) - parseFloat(String(b.price)));
    } else if (sort === "price-high") {
      list.sort((a, b) => parseFloat(String(b.price)) - parseFloat(String(a.price)));
    } else if (sort === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    }

    return list;
  }, [products, variantsByProductId, colorsByProductId, filters, sort, categoryFilterTags]);

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

  return (
    <div className="w-full min-h-screen bg-background">
      <CategoryHeader category={validCategory} categorySlug={categorySlug} categoryLabel={categoryLabel} />

      <div className="px-6 py-3 border-b border-border">
        <ShopSearchBar storeType={storeType} initialQuery={initialQuery} />
      </div>
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <UtilityBar
          onMobileFiltersOpen={() => setMobileFilterOpen(true)}
          onDesktopFiltersToggle={() => setDesktopFilterOpen((o) => !o)}
          sort={sort}
          onSortChange={handleSortChange}
        />
      </div>
      <FilterPanel
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        priceBounds={priceBounds}
        showMainCategorySection={showMainCategorySection}
        mainCategories={mainCategoryOptions}
        attributeSections={attributeSectionsForFilters}
        variantSizeOptions={filterVariantSizes}
        productColorOptions={filterProductColorNames}
        selectedAttributeSlugs={selectedAttributeSlugs}
        onToggleAttribute={toggleAttributeSlug}
      />
      <div className="flex relative w-full items-start gap-x-6 px-6 py-8">
        <aside
          className={cn(
            "hidden md:block shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            desktopFilterOpen
              ? "w-[250px] lg:w-[280px] opacity-100"
              : "w-0 opacity-0 m-0 p-0 pointer-events-none",
          )}
          aria-hidden={!desktopFilterOpen}
        >
          <div
            className={cn(
              "w-[250px] lg:w-[280px] pr-4 lg:pr-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-y-contain",
            )}
          >
            <FilterPanelContent
              filters={filters}
              onFiltersChange={setFilters}
              priceBounds={priceBounds}
              showMainCategorySection={showMainCategorySection}
              mainCategories={mainCategoryOptions}
              attributeSections={attributeSectionsForFilters}
              variantSizeOptions={filterVariantSizes}
              productColorOptions={filterProductColorNames}
              selectedAttributeSlugs={selectedAttributeSlugs}
              onToggleAttribute={toggleAttributeSlug}
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
                  "grid gap-6",
                  desktopFilterOpen
                    ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                )}
              >
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variants={variantsByProductId[product.id] ?? []}
                    colors={colorsByProductId[product.id]}
                    inWishlist={wishlistProductIds.includes(product.id)}
                  />
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
