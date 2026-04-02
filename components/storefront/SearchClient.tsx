"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronUp } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
import { UtilityBar } from "@/components/UtilityBar";
import {
  FilterPanel,
  FilterPanelContent,
  type AttributeFilterSection,
  type FilterState,
  type ShopSortOption,
} from "@/components/FilterPanel";
import { cn, getProductBasePriceNumber } from "@/lib/utils";
import type { ProductColor, ProductVariant } from "@/db/schema";
import type { MosaikLocale } from "@/lib/i18n-locales";
import {
  loadSearchRecommendations,
  loadSearchResultsBundle,
  loadSearchResultsMore,
} from "@/actions/search-page-data";

const SCROLL_TOP_THRESHOLD_PX = 600;
/** Sentinel sits on the first tile of the 2nd-to-last row in a 4-column grid (8 tiles from the end). */
const SENTINEL_OFFSET_FROM_END = 8;

type SearchRecommendationsPayload = Awaited<ReturnType<typeof loadSearchRecommendations>>;
type SearchResultsPayload = Awaited<ReturnType<typeof loadSearchResultsBundle>>;
type SearchListingProduct = SearchResultsPayload["products"][number];

function SearchProductSkeletonGrid({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:gap-8", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="min-w-0 aspect-[3/4] animate-pulse bg-muted/35" />
      ))}
    </div>
  );
}

export interface SearchClientProps {
  locale: MosaikLocale;
  initialQuery: string;
  wishlistProductIds: number[];
}

export function SearchClient({ locale, initialQuery, wishlistProductIds }: SearchClientProps) {
  const t = useTranslations("Search");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = (searchParams.get("q") ?? "").trim();
  const hasSearched = qFromUrl.length > 0;

  const [inputValue, setInputValue] = useState(initialQuery);
  useEffect(() => {
    setInputValue(qFromUrl);
  }, [qFromUrl]);

  const [, startNavTransition] = useTransition();
  const [isRecPending, startRecTransition] = useTransition();
  const [, startAppendTransition] = useTransition();

  const [recommended, setRecommended] = useState<SearchRecommendationsPayload | null>(null);

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

  const [searchProducts, setSearchProducts] = useState<SearchListingProduct[]>([]);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [searchVariantsByProductId, setSearchVariantsByProductId] = useState<Record<number, ProductVariant[]>>(
    {},
  );
  const [searchColorsByProductId, setSearchColorsByProductId] = useState<Record<number, ProductColor[]>>({});
  const [attributeSectionsForFilters, setAttributeSectionsForFilters] = useState<AttributeFilterSection[]>([]);
  const [filterVariantSizes, setFilterVariantSizes] = useState<string[]>([]);
  const [filterProductColorNames, setFilterProductColorNames] = useState<string[]>([]);
  const [categoryFilterTags, setCategoryFilterTags] = useState<SearchResultsPayload["categoryFilterTags"]>({});
  const [attributeSlugsByProductId, setAttributeSlugsByProductId] = useState<Record<number, string[]>>({});
  const [storeMainCategories, setStoreMainCategories] = useState<SearchResultsPayload["storeMainCategories"]>([]);

  const [isSearchFetchLoading, setIsSearchFetchLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const qRef = useRef(qFromUrl);
  const localeRef = useRef(locale);
  const searchProductsLenRef = useRef(0);
  const searchTotalCountRef = useRef(0);
  const fetchMoreGuardRef = useRef(false);

  qRef.current = qFromUrl;
  localeRef.current = locale;
  searchProductsLenRef.current = searchProducts.length;
  searchTotalCountRef.current = searchTotalCount;

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

  useEffect(() => {
    if (hasSearched) return;
    let cancelled = false;
    void (async () => {
      const data = await loadSearchRecommendations(locale);
      if (cancelled) return;
      startRecTransition(() => setRecommended(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSearched, locale]);

  useEffect(() => {
    if (!hasSearched) {
      setSearchProducts([]);
      setSearchTotalCount(0);
      setSearchVariantsByProductId({});
      setSearchColorsByProductId({});
      setAttributeSectionsForFilters([]);
      setFilterVariantSizes([]);
      setFilterProductColorNames([]);
      setCategoryFilterTags({});
      setAttributeSlugsByProductId({});
      setStoreMainCategories([]);
      setSelectedAttributes({});
      setIsSearchFetchLoading(false);
      setIsLoadingMore(false);
      fetchMoreGuardRef.current = false;
      priceInitialized.current = false;
      return;
    }

    let cancelled = false;
    setIsSearchFetchLoading(true);
    fetchMoreGuardRef.current = false;

    void (async () => {
      try {
        const data = await loadSearchResultsBundle(qFromUrl, locale);
        if (cancelled) return;
        startRecTransition(() => {
          setSearchProducts(data.products);
          setSearchTotalCount(data.totalCount);
          setSearchVariantsByProductId(data.variantsByProductId);
          setSearchColorsByProductId(data.colorsByProductId);
          setAttributeSectionsForFilters(data.attributeSectionsForFilters);
          setFilterVariantSizes(data.filterVariantSizes);
          setFilterProductColorNames(data.filterProductColorNames);
          setCategoryFilterTags(data.categoryFilterTags);
          setAttributeSlugsByProductId(data.attributeSlugsByProductId);
          setStoreMainCategories(data.storeMainCategories);
          priceInitialized.current = false;
          setSelectedAttributes({});
        });
      } finally {
        if (!cancelled) setIsSearchFetchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasSearched, qFromUrl, locale]);

  const loadNextPage = useCallback(async () => {
    if (fetchMoreGuardRef.current) return;
    const offset = searchProductsLenRef.current;
    const total = searchTotalCountRef.current;
    const q = qRef.current;
    const loc = localeRef.current;
    if (offset >= total || total === 0 || !q) return;

    fetchMoreGuardRef.current = true;
    setIsLoadingMore(true);
    try {
      const chunk = await loadSearchResultsMore(q, loc, offset);
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
  }, []);

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
  }, [qFromUrl]);

  useEffect(() => {
    if (searchProducts.length > 0 && priceBounds.max > 0 && !priceInitialized.current) {
      priceInitialized.current = true;
      setFilters((prev) => ({
        ...prev,
        priceMin: priceBounds.min,
        priceMax: priceBounds.max,
      }));
    }
  }, [searchProducts.length, priceBounds.min, priceBounds.max]);

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

  const hasMoreServer = searchProducts.length < searchTotalCount && searchTotalCount > 0;

  const sentinelIndex = useMemo(() => {
    const n = filteredAndSorted.length;
    if (n === 0) return -1;
    return n >= SENTINEL_OFFSET_FROM_END ? n - SENTINEL_OFFSET_FROM_END : n - 1;
  }, [filteredAndSorted]);

  const sentinelProductId = sentinelIndex >= 0 ? filteredAndSorted[sentinelIndex]?.id : undefined;

  useLayoutEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreServer || isLoadingMore || isSearchFetchLoading || sentinelIndex < 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible) return;
        loadMoreFromObserverRef.current();
      },
      { root: null, rootMargin: "120px", threshold: 0 },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [sentinelProductId, hasMoreServer, isLoadingMore, isSearchFetchLoading, sentinelIndex]);

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

  const searchListAwaitingFirstPaint = hasSearched && isSearchFetchLoading && searchProducts.length === 0;

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

      {!hasSearched ? (
        <section className="px-4 pb-10 sm:px-5 md:px-6 md:pb-12" aria-busy={isRecPending}>
          <h2 className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("thingsYouMightLike")}
          </h2>
          {recommended == null ? (
            <SearchProductSkeletonGrid count={10} className="md:grid-cols-5" />
          ) : recommended.products.length === 0 ? (
            <p className="py-16 text-center text-sm font-light text-muted-foreground">{t("noRecommendations")}</p>
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-5 md:gap-4 lg:gap-6",
                isRecPending && "opacity-60 pointer-events-none transition-opacity",
              )}
            >
              {recommended.products.map((product) => (
                <div key={product.id} className="min-w-0">
                  <ProductCard
                    product={product}
                    variants={recommended.variantsByProductId[product.id] ?? []}
                    colors={recommended.colorsByProductId[product.id]}
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
              totalResultCount={searchTotalCount}
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
            <div
              className="flex-1 min-w-0 transition-all duration-300 ease-in-out"
              aria-busy={searchListAwaitingFirstPaint || isLoadingMore}
            >
              {searchTotalCount === 0 && !isSearchFetchLoading ? (
                <p className="py-16 text-center text-sm font-light text-muted-foreground">{t("noResults")}</p>
              ) : searchListAwaitingFirstPaint ? (
                <SearchProductSkeletonGrid
                  count={8}
                  className={cn(desktopFilterOpen ? "gap-2 sm:gap-4 lg:gap-3" : undefined)}
                />
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
                      <div
                        key={product.id}
                        ref={i === sentinelIndex ? sentinelRef : undefined}
                        className="min-w-0"
                      >
                        <ProductCard
                          product={product}
                          variants={searchVariantsByProductId[product.id] ?? []}
                          colors={searchColorsByProductId[product.id]}
                          inWishlist={wishlistProductIds.includes(product.id)}
                        />
                      </div>
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
