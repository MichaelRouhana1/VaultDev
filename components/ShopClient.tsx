"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { CategoryHeader } from "@/components/CategoryHeader";
import { UtilityBar, type SortOption } from "@/components/UtilityBar";
import { ShopSearchBar } from "@/components/ShopSearchBar";
import { FilterPanel, type FilterState, type ShopFilterPanelContext, type SubcategoryFilterOption } from "@/components/FilterPanel";
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
  subcategoriesForFilters: { slug: string; label: string }[];
  shopFilterContext: ShopFilterPanelContext;
  categoryFilterTags: Record<number, ProductCategoryFilterTags>;
  storeType: string;
  initialQuery?: string;
}

export function ShopClient({
  products,
  variantsByProductId,
  colorsByProductId = {},
  wishlistProductIds,
  categoryLabel,
  storeMainCategories,
  subcategoriesForFilters,
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

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
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
    subcategory: [],
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

    if (filters.subcategory.length > 0) {
      list = list.filter((p) => {
        const t = categoryFilterTags[p.id];
        return t?.subSlug != null && filters.subcategory.includes(t.subSlug);
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
        const nameLower = p.name.toLowerCase();
        const descLower = (p.description ?? "").toLowerCase();
        const searchText = `${nameLower} ${descLower}`;
        return filters.color.some((c) => searchText.includes(c.toLowerCase()));
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
  }, [products, variantsByProductId, filters, sort, categoryFilterTags]);

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

  const subcategoryOptionsAll: SubcategoryFilterOption[] = useMemo(
    () => subcategoriesForFilters.map((s) => ({ value: s.slug, label: s.label })),
    [subcategoriesForFilters],
  );

  return (
    <div className="w-full min-h-screen bg-background">
      <CategoryHeader category={validCategory} categorySlug={categorySlug} categoryLabel={categoryLabel} />

      <div className="px-6 py-3 border-b border-border">
        <ShopSearchBar storeType={storeType} initialQuery={initialQuery} />
      </div>
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <UtilityBar onFiltersClick={() => setFilterPanelOpen(true)} sort={sort} onSortChange={handleSortChange} />
      </div>
      <FilterPanel
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        priceBounds={priceBounds}
        shopFilterContext={shopFilterContext}
        mainCategories={mainCategoryOptions}
        subcategories={subcategoryOptionsAll}
      />
      <main className="w-full px-6 py-8">
        {filteredAndSorted.length === 0 ? (
          <p className="text-center text-sm font-light text-muted-foreground py-16">No products match your filters.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
  );
}
