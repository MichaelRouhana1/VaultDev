"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { ChevronUp } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
import { UtilityBar } from "@/components/UtilityBar";
import {
  FilterPanel,
  FilterPanelContent,
  type FilterState,
  type ShopSortOption,
} from "@/components/FilterPanel";
import { cn, getProductBasePriceNumber } from "@/lib/utils";
import type { ProductColor, ProductVariant } from "@/db/schema";
import type { MosaikLocale } from "@/lib/i18n-locales";
import {
  loadSearchResultsMore,
  type SearchListingProduct,
  type SearchPageFilterContext,
} from "@/actions/search-page-data";

const EMPTY_SEARCH_FILTERS: SearchPageFilterContext = {
  attributeSectionsForFilters: [],
  filterVariantSizes: [],
  filterProductColorNames: [],
  categoryFilterTags: {},
  attributeSlugsByProductId: {},
  storeMainCategories: [],
};

const SCROLL_TOP_THRESHOLD_PX = 800;
/** Invisible trigger sits immediately before the product index that is 8 tiles from the end (2 rows in a 4-col grid). */
const SENTINEL_OFFSET_FROM_END = 8;

export interface SearchClientProps {
  locale: MosaikLocale;
  wishlistProductIds: number[];
  /** Current `?q=` value from the server (URL-driven). */
  searchQuery: string;
  /** Total FTS hits for the current query (0 when browsing). */
  totalCount: number;
  /** First page of search results (up to 40), hydrated for cards. */
  initialProducts: SearchListingProduct[];
  /** Empty-state grid (max 40), hydrated for cards. */
  recommendedProducts: SearchListingProduct[];
  initialVariantsByProductId: Record<number, ProductVariant[]>;
  initialColorsByProductId: Record<number, ProductColor[]>;
  recommendedVariantsByProductId: Record<number, ProductVariant[]>;
  recommendedColorsByProductId: Record<number, ProductColor[]>;
  /** Facets / filter metadata when `searchQuery` is non-empty. */
  searchFilters: SearchPageFilterContext | null;
}

export function SearchClient({
  locale,
  wishlistProductIds,
  searchQuery,
  totalCount,
  initialProducts,
  recommendedProducts,
  initialVariantsByProductId,
  initialColorsByProductId,
  recommendedVariantsByProductId,
  recommendedColorsByProductId,
  searchFilters,
}: SearchClientProps) {
  const t = useTranslations("Search");
  const router = useRouter();
  const pathname = usePathname();

  const hasSearch = searchQuery.trim().length > 0;

  const [inputValue, setInputValue] = useState(searchQuery);
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const [, startNavTransition] = useTransition();
  const [, startAppendTransition] = useTransition();

  const [sort, setSort] = useState<ShopSortOption>("price-low");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 500,
    size: [],
    color: [],
    mainCategory: [],
  });
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const priceInitialized = useRef(false);

  const [searchProducts, setSearchProducts] = useState<SearchListingProduct[]>(() => initialProducts);
  const [searchVariantsByProductId, setSearchVariantsByProductId] = useState<
    Record<number, ProductVariant[]>
  >(() => initialVariantsByProductId);
  const [searchColorsByProductId, setSearchColorsByProductId] = useState<Record<number, ProductColor[]>>(
    () => initialColorsByProductId,
  );

  const facet = searchFilters ?? EMPTY_SEARCH_FILTERS;
  const [attributeSectionsForFilters] = useState(() => facet.attributeSectionsForFilters);
  const [filterVariantSizes] = useState(() => facet.filterVariantSizes);
  const [filterProductColorNames] = useState(() => facet.filterProductColorNames);
  const [categoryFilterTags, setCategoryFilterTags] = useState(() => facet.categoryFilterTags);
  const [attributeSlugsByProductId, setAttributeSlugsByProductId] = useState(
    () => facet.attributeSlugsByProductId,
  );
  const [storeMainCategories] = useState(() => facet.storeMainCategories);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const localeRef = useRef(locale);
  const queryRef = useRef(searchQuery);
  const searchProductsLenRef = useRef(searchProducts.length);
  const fetchMoreGuardRef = useRef(false);

  localeRef.current = locale;
  queryRef.current = searchQuery;
  searchProductsLenRef.current = searchProducts.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreFromObserverRef = useRef<() => void>(() => {});

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > SCROLL_TOP_THRESHOLD_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTopInstant = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const loadNextPage = useCallback(async () => {
    if (!hasSearch || fetchMoreGuardRef.current) return;
    const offset = searchProductsLenRef.current;
    if (offset >= totalCount || totalCount === 0) return;

    fetchMoreGuardRef.current = true;
    setIsLoadingMore(true);
    try {
      const chunk = await loadSearchResultsMore(queryRef.current.trim(), localeRef.current, offset);
      startAppendTransition(() => {
        setSearchProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const next = [...prev];
          for (const p of chunk.products) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              next.push(p);
            }
          }
          return next;
        });
        setSearchVariantsByProductId((prev) => ({ ...prev, ...chunk.variantsByProductId }));
        setSearchColorsByProductId((prev) => ({ ...prev, ...chunk.colorsByProductId }));
        setCategoryFilterTags((prev) => ({ ...prev, ...chunk.categoryFilterTags }));
        setAttributeSlugsByProductId((prev) => ({ ...prev, ...chunk.attributeSlugsByProductId }));
      });
    } finally {
      setIsLoadingMore(false);
      requestAnimationFrame(() => {
        fetchMoreGuardRef.current = false;
      });
    }
  }, [hasSearch, totalCount]);

  loadMoreFromObserverRef.current = () => {
    void loadNextPage();
  };

  const productRows = useMemo(
    () =>
      searchProducts.map((p) => ({
        product: p,
        basePrice: getProductBasePriceNumber(p),
      })),
    [searchProducts],
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
  }, [searchQuery]);

  useEffect(() => {
    if (!hasSearch || searchProducts.length === 0 || priceBounds.max <= 0 || priceInitialized.current) return;
    priceInitialized.current = true;
    setFilters((prev) => ({
      ...prev,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
    }));
  }, [hasSearch, searchProducts.length, priceBounds.min, priceBounds.max]);

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
    if (!hasSearch) return [];
    let list = [...productRows];

    const priceMin = filters.priceMin ?? 0;
    const priceMax = filters.priceMax ?? Infinity;
    list = list.filter(({ basePrice }) => basePrice >= priceMin && basePrice <= priceMax);

    if (filters.mainCategory.length > 0) {
      list = list.filter(({ product: p }) => {
        const tag = categoryFilterTags[p.id];
        return tag != null && filters.mainCategory.includes(tag.mainSlug);
      });
    }

    if (filters.size.length > 0) {
      list = list.filter(({ product: p }) => {
        const variants = searchVariantsByProductId[p.id] ?? [];
        const availableSizes = variants.filter((v) => v.stock > 0).map((v) => v.size);
        return filters.size.some((s) => availableSizes.includes(s));
      });
    }

    if (filters.color.length > 0) {
      list = list.filter(({ product: p }) => {
        const cols = searchColorsByProductId[p.id] ?? [];
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
    hasSearch,
    productRows,
    searchVariantsByProductId,
    searchColorsByProductId,
    attributeSlugsByProductId,
    filters,
    selectedAttributes,
    attributeSectionsForFilters,
    sort,
    categoryFilterTags,
  ]);

  const hasMoreServer = hasSearch && searchProducts.length < totalCount && totalCount > 0;

  const triggerInsertIndex = useMemo(
    () => (filteredAndSorted.length === 0 ? -1 : Math.max(0, filteredAndSorted.length - SENTINEL_OFFSET_FROM_END)),
    [filteredAndSorted.length],
  );

  const triggerKey =
    triggerInsertIndex >= 0 && filteredAndSorted[triggerInsertIndex]
      ? filteredAndSorted[triggerInsertIndex].id
      : "none";

  useLayoutEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreServer || isLoadingMore || triggerInsertIndex < 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        loadMoreFromObserverRef.current();
      },
      { root: null, rootMargin: "160px", threshold: 0 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [triggerKey, hasMoreServer, isLoadingMore, triggerInsertIndex]);

  const mainCategoryOptions = useMemo(
    () => storeMainCategories.map((c) => ({ value: c.slug, label: c.label })),
    [storeMainCategories],
  );

  const showMainCategorySection = storeMainCategories.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    startNavTransition(() => {
      const href = trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname;
      router.replace(href, { scroll: false });
    });
  };

  return (
    <main id="main-content" className="w-full min-h-screen bg-background">
      <button
        type="button"
        onClick={scrollToTopInstant}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center border border-border bg-background text-foreground shadow-sm transition-opacity duration-200 ease-out",
          "hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
          showScrollTop ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label={t("scrollToTopAria")}
      >
        <ChevronUp className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>

      <div className="px-4 pt-6 pb-4 sm:px-5 md:px-6 md:pt-8">
        <h1 className="text-center text-xs font-medium uppercase tracking-[0.25em] text-foreground">{t("title")}</h1>
        <form onSubmit={handleSubmit} className="mx-auto mt-6 w-full max-w-2xl">
          <label htmlFor="storefront-search" className="sr-only">
            {t("title")}
          </label>
          <input
            id="storefront-search"
            name="q"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("placeholder")}
            enterKeyHint="search"
            autoComplete="off"
            className={cn(
              "w-full border border-foreground/25 bg-background px-4 py-3.5 text-base md:py-4 md:text-lg",
              "font-light tracking-wide text-foreground placeholder:text-muted-foreground/80",
              "focus:border-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40",
            )}
          />
        </form>
      </div>

      {!hasSearch ? (
        <section className="px-4 pb-10 sm:px-5 md:px-6 md:pb-12">
          <h2 className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("thingsYouMightLike")}
          </h2>
          {recommendedProducts.length === 0 ? (
            <p className="py-16 text-center text-sm font-light text-muted-foreground">{t("noRecommendations")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-5 md:gap-4 lg:gap-6">
              {recommendedProducts.map((product) => (
                <div key={product.id} className="min-w-0">
                  <ProductCard
                    product={product}
                    variants={recommendedVariantsByProductId[product.id] ?? []}
                    colors={recommendedColorsByProductId[product.id]}
                    inWishlist={wishlistProductIds.includes(product.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="sticky top-14 z-30 bg-background">
            <UtilityBar
              onMobileFiltersOpen={() => setMobileFilterOpen(true)}
              onDesktopFiltersToggle={() => setDesktopFilterOpen((o) => !o)}
              totalResultCount={totalCount}
            />
          </div>
          <FilterPanel
            isOpen={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            filters={filters}
            onFiltersChange={setFilters}
            priceBounds={priceBounds}
            sort={sort}
            onSortChange={setSort}
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
                  onSortChange={setSort}
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
            <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out" aria-busy={isLoadingMore}>
              {totalCount === 0 ? (
                <p className="py-16 text-center text-sm font-light text-muted-foreground">{t("noResults")}</p>
              ) : filteredAndSorted.length === 0 ? (
                <p className="py-16 text-center text-sm font-light text-muted-foreground">{t("noFilterMatch")}</p>
              ) : (
                <>
                  <div
                    className={cn(
                      "grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4",
                      desktopFilterOpen ? "gap-2 sm:gap-4 lg:gap-3" : "gap-4 sm:gap-6 lg:gap-8",
                    )}
                  >
                    {filteredAndSorted.map((product, i) => (
                      <Fragment key={product.id}>
                        {i === triggerInsertIndex ? (
                          <div
                            ref={sentinelRef}
                            className="col-span-2 md:col-span-4 h-px min-h-px w-full overflow-hidden opacity-0"
                            aria-hidden
                          />
                        ) : null}
                        <div className="min-w-0">
                          <ProductCard
                            product={product}
                            variants={searchVariantsByProductId[product.id] ?? []}
                            colors={searchColorsByProductId[product.id]}
                            inWishlist={wishlistProductIds.includes(product.id)}
                          />
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {isLoadingMore ? (
                    <div
                      className="flex flex-col items-center gap-2 py-8 text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      <div
                        className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground/50"
                        aria-hidden
                      />
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em]">{t("loadingMore")}</span>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
