"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn, getProductDisplayPrice, isProductOnSale, sortSizes } from "@/lib/utils";
import { ProductDetailAccordion } from "@/components/ProductDetailAccordion";
import type { ProductPageAccordionResolved } from "@/actions/product-page-copy";
import type { ProductVariant, ProductColor, StorefrontProductResolved } from "@/db/schema";
import { WishlistBookmarkIcon } from "@/components/WishlistBookmarkIcon";
import { PRODUCT_STICKY_BUYBAR_CSS_VAR } from "@/lib/product-sticky-buybar";
import type { EmblaOptionsType } from "embla-carousel";
import { ChevronLeft, Search, ShoppingBag, User } from "lucide-react";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

interface ProductDetailClientProps {
  product: StorefrontProductResolved & { images?: string[] };
  variants: ProductVariant[];
  colors?: ProductColor[];
  inWishlist: boolean;
  similarProducts: StorefrontProductResolved[];
  variantsByProductId: Record<number, ProductVariant[]>;
  wishlistProductIds: number[];
  /** From URL — used for bag / product links */
  listStoreType: "streetwear" | "formal";
  productPageAccordionCopy: ProductPageAccordionResolved;
}

export function ProductDetailClient({
  product,
  variants,
  colors = [],
  inWishlist: initialInWishlist,
  similarProducts,
  variantsByProductId,
  wishlistProductIds,
  listStoreType,
  productPageAccordionCopy,
}: ProductDetailClientProps) {
  const router = useRouter();
  const t = useTranslations("ProductDetail");
  const tCommon = useTranslations("Common");
  const searchParams = useSearchParams();
  const { addToCart, openCart } = useCart();
  const { formatPrice } = useCurrency();
  const { isInWishlist, hasHydrated, toggleItem } = useWishlist();
  const wishlistState = hasHydrated ? isInWishlist(product.id) : initialInWishlist;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const lightboxScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const similarSectionRef = useRef<HTMLElement | null>(null);
  const similarSectionMobileRef = useRef<HTMLElement | null>(null);
  const stickyBuyBarRef = useRef<HTMLDivElement | null>(null);
  const [similarSectionInView, setSimilarSectionInView] = useState(false);
  const [stickyBuyPhase, setStickyBuyPhase] = useState<"summary" | "pickSize">("summary");
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

  const firstColor = colors[0];
  const colorFromUrl = searchParams.get("color");
  const initialColor =
    colorFromUrl && colors.find((c) => c.name.toLowerCase() === colorFromUrl.toLowerCase())
      ? colors.find((c) => c.name.toLowerCase() === colorFromUrl.toLowerCase())!
      : firstColor;
  const [selectedColor, setSelectedColorState] = useState<ProductColor | null>(initialColor ?? null);

  useEffect(() => {
    const matched = colorFromUrl?.trim()
      ? colors.find((col) => col.name.toLowerCase() === colorFromUrl.toLowerCase())
      : undefined;
    setSelectedColorState(matched ?? firstColor ?? null);
  }, [colorFromUrl, firstColor, colors]);

  const imageUrls = useMemo(
    () => (selectedColor?.imageUrls ?? product.images) ?? [],
    [selectedColor?.imageUrls, product.images]
  );

  const mobileCarouselOpts = useMemo<EmblaOptionsType>(
    () => ({
      align: "start",
      containScroll: "trimSnaps",
      loop: imageUrls.length > 1,
    }),
    [imageUrls.length]
  );

  useEffect(() => {
    setDisplayOrder(imageUrls.map((_, i) => i));
  }, [imageUrls, product.id, selectedColor?.id]);

  useEffect(() => {
    carouselApi?.scrollTo(0);
  }, [selectedColor?.id, imageUrls.length, carouselApi]);

  useEffect(() => {
    setStickyBuyPhase("summary");
  }, [selectedColor?.id]);

  useLayoutEffect(() => {
    if (similarProducts.length === 0) {
      setSimilarSectionInView(false);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        setSimilarSectionInView(entries.some((e) => e.isIntersecting));
      },
      { threshold: 0, rootMargin: "0px" },
    );
    const observeBoth = () => {
      const desktopEl = similarSectionRef.current;
      const mobileEl = similarSectionMobileRef.current;
      if (desktopEl) io.observe(desktopEl);
      if (mobileEl) io.observe(mobileEl);
    };
    observeBoth();
    const raf = requestAnimationFrame(observeBoth);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [similarProducts.length]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      document.body.style.overflow = mq.matches ? "hidden" : "";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!similarSectionInView) setStickyBuyPhase("summary");
  }, [similarSectionInView]);

  const hasMultipleImages = imageUrls.length >= 2;

  const handleColorSelect = useCallback(
    (color: ProductColor) => {
      setSelectedColorState(color);
      setSelectedSize(null);
      setIsColorMenuOpen(false);
      const params = new URLSearchParams(searchParams.toString());
      params.set("color", color.name);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );
  const price = typeof product.price === "string" ? product.price : String(product.price);
  const displayPrice = getProductDisplayPrice(product);
  const onSale = isProductOnSale(product);

  const variantsForColor =
    selectedColor?.id != null
      ? variants.filter((v) => v.colorId === selectedColor.id)
      : variants;
  const variantMap = new Map(variantsForColor.map((v) => [v.size, v]));
  const sizes =
    variantsForColor.length > 0
      ? sortSizes([...new Set(variantsForColor.map((v) => v.size))])
      : sortSizes([...DEFAULT_SIZES]);

  const getStockForSize = (size: string) => variantMap.get(size)?.stock ?? 0;
  const isSizeInStock = (size: string) => getStockForSize(size) > 0;
  const hasAnyInStock = sizes.some(isSizeInStock);
  const canAddToCart = selectedSize != null && isSizeInStock(selectedSize);

  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const mainImageIndex = displayOrder[0] ?? 0;

  const goToPrevImage = () => {
    setDisplayOrder((order) => {
      if (order.length <= 1) return order;
      return [...order.slice(1), order[0]];
    });
  };

  const goToNextImage = () => {
    setDisplayOrder((order) => {
      if (order.length <= 1) return order;
      return [order[order.length - 1], ...order.slice(0, -1)];
    });
  };

  const handleThumbnailClick = (position: number) => {
    setDisplayOrder((order) => {
      if (position <= 0 || position >= order.length) return order;
      const next = [...order];
      [next[0], next[position]] = [next[position], next[0]];
      return next;
    });
  };

  const openLightbox = () => {
    setLightboxIndex(mainImageIndex);
    setLightboxZoomed(false);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setDisplayOrder((order) => {
      const idx = order.indexOf(lightboxIndex);
      if (idx <= 0) return order;
      const next = [...order];
      [next[0], next[idx]] = [next[idx], next[0]];
      return next;
    });
    setLightboxOpen(false);
    setLightboxZoomed(false);
  }, [lightboxIndex]);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
    setLightboxZoomed(false);
    lightboxScrollRef.current?.scrollTo(0, 0);
  }, [imageUrls.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % imageUrls.length);
    setLightboxZoomed(false);
    lightboxScrollRef.current?.scrollTo(0, 0);
  }, [imageUrls.length]);

  const handleLightboxDragStart = useCallback((clientX: number, clientY: number) => {
    const el = lightboxScrollRef.current;
    if (!el || !lightboxZoomed) return;
    dragRef.current = { x: clientX, y: clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
  }, [lightboxZoomed]);

  const handleLightboxDragMove = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current;
    const el = lightboxScrollRef.current;
    if (!d || !el) return;
    el.scrollLeft = d.scrollLeft + d.x - clientX;
    el.scrollTop = d.scrollTop + d.y - clientY;
  }, []);

  const handleLightboxDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, closeLightbox, lightboxPrev, lightboxNext]);

  const handleBack = useCallback(() => {
    if (typeof window === "undefined") return;

    // Client navigations in Next.js do not refresh document.referrer; stack depth is the reliable signal.
    // Use length > 1 (not > 2) so routes like home → PDP still get a real back().
    // With length === 1, router.back() is a no-op or wrong even if referrer is same-origin (e.g. new tab).
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(`/${listStoreType}/shop`, { scroll: true });
  }, [router, listStoreType]);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleItem(product.id);
  };

  const addLineForSize = (size: string, options?: { openBag?: boolean }) => {
    if (!isSizeInStock(size)) return;
    const productImage = imageUrls[0];
    const colorName = selectedColor?.name ?? product.color ?? undefined;
    addToCart({
      productId: product.id,
      size,
      quantity: 1,
      priceAtPurchase: displayPrice,
      productName: product.name,
      productImage,
      productColor: colorName,
      storeTypeForUrl: listStoreType,
      sku:
        colors.length > 1 && selectedColor
          ? `${product.id}-${selectedColor.id}-${size}`
          : undefined,
    });
    if (options?.openBag !== false) openCart();
    setSelectedSize(size);
    setStickyBuyPhase("summary");
  };

  const handleAddToBag = () => {
    if (!selectedSize || !isSizeInStock(selectedSize)) return;
    addLineForSize(selectedSize);
  };

  const handleStickyBarAddClick = () => {
    if (!hasAnyInStock) return;
    if (stickyBuyPhase === "pickSize") {
      setStickyBuyPhase("summary");
      return;
    }
    // Expand size chips only; bag drawer opens after a size is chosen (see addLineForSize).
    setStickyBuyPhase("pickSize");
  };

  const handleStickyBarSizeClick = (size: string) => {
    if (!isSizeInStock(size)) return;
    addLineForSize(size);
  };

  const mainSrc =
    imageUrls[mainImageIndex] && !imageErrors[mainImageIndex]
      ? imageUrls[mainImageIndex]
      : null;

  const stickyThumbSrc = imageUrls[0] && !imageErrors[0] ? imageUrls[0] : null;
  const showStickyBuyBar = similarProducts.length > 0 && similarSectionInView && !lightboxOpen;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = stickyBuyBarRef.current;
    if (!showStickyBuyBar || !el) {
      root.style.removeProperty(PRODUCT_STICKY_BUYBAR_CSS_VAR);
      return;
    }
    const apply = () => {
      root.style.setProperty(PRODUCT_STICKY_BUYBAR_CSS_VAR, `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty(PRODUCT_STICKY_BUYBAR_CSS_VAR);
    };
  }, [showStickyBuyBar, stickyBuyPhase]);

  const priceBlock = onSale ? (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className="line-through text-muted-foreground text-sm">{formatPrice(price)}</span>
      <span className="text-destructive font-semibold">{formatPrice(displayPrice)}</span>
    </span>
  ) : (
    <span className="text-sm font-semibold">{formatPrice(displayPrice)}</span>
  );

  const navIconPill =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_1px_8px_rgba(0,0,0,0.35)] backdrop-blur-sm dark:bg-black/55";

  return (
    <main
      className={cn(
        "relative mx-auto w-full max-md:max-w-none md:max-w-[min(100%,1680px)] md:px-5 lg:px-6 xl:px-8 md:py-12",
        showStickyBuyBar && "pb-20 md:pb-[4.75rem]",
      )}
    >
      {/* Mobile: full-screen PDP above global nav */}
      <div className="fixed inset-0 z-[55] flex flex-col overflow-y-auto overscroll-y-contain bg-background md:hidden">
        <div className="relative w-full shrink-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
            <button
              type="button"
              onClick={handleBack}
              className={navIconPill}
              aria-label={t("mobileBackAria")}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex items-center gap-2">
              <Link href={`/${listStoreType}/shop`} className={navIconPill} aria-label={t("mobileSearchShopAria")}>
                <Search className="h-5 w-5" aria-hidden />
              </Link>
              <Link href="/account" className={navIconPill} aria-label={t("mobileAccountAria")}>
                <User className="h-5 w-5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => openCart()}
                className={navIconPill}
                aria-label={tCommon("viewShoppingBagAria")}
              >
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          <Carousel setApi={setCarouselApi} opts={mobileCarouselOpts} className="relative z-0 w-full min-w-0">
            <CarouselContent>
              {imageUrls.map((url, idx) => {
                const hasError = imageErrors[idx];
                const src = !hasError && url ? url : null;
                return (
                  <CarouselItem key={idx} className="min-w-0 max-w-full shrink-0 grow-0 basis-full">
                    <div
                      className="relative aspect-[2/3] w-full cursor-pointer overflow-hidden bg-muted"
                      onClick={() => {
                        setLightboxIndex(idx);
                        openLightbox();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && (setLightboxIndex(idx), openLightbox())}
                      aria-label={t("viewFullImage")}
                    >
                      {src ? (
                        <Image
                          src={src}
                          alt={product.description ? `${product.name} - ${product.description}` : product.name}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(idx)}
                          sizes="100vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                          {t("noImage")}
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] flex items-end justify-between gap-2 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-14">
              <span className="h-10 w-10 shrink-0" aria-hidden />
              <div className="pointer-events-auto flex min-w-0 flex-1 justify-center">
                <CarouselDots variant="onImage" className="mt-0" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleWishlistClick(e);
                }}
                className={cn(navIconPill, "pointer-events-auto shrink-0")}
                aria-label={wishlistState ? t("wishlistRemove") : t("wishlistAdd")}
              >
                <WishlistBookmarkIcon active={wishlistState} className="h-5 w-5" />
              </button>
            </div>
          </Carousel>
          {colors.length > 1 ? (
            <div
              id="mobile-color-menu"
              className={cn(
                "absolute inset-x-0 bottom-0 z-[30] border-t border-border bg-background/95 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-transform duration-300 ease-in-out dark:bg-background/95 dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)]",
                isColorMenuOpen
                  ? "translate-y-0 opacity-100 pointer-events-auto"
                  : "translate-y-full opacity-0 pointer-events-none",
              )}
              aria-hidden={!isColorMenuOpen}
            >
              <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 py-3">
                {colors.map((c) => {
                  const isSelected = selectedColor?.id === c.id;
                  const thumb = c.imageUrls?.[0] ?? null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleColorSelect(c)}
                      className="shrink-0 rounded-none border-0 bg-transparent p-0 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      title={c.name}
                      aria-label={t("selectColorAria", { name: c.name })}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={cn(
                          "relative block h-10 w-10 overflow-hidden border border-border bg-muted bg-cover bg-center",
                          isSelected &&
                            "ring-1 ring-foreground ring-offset-1 ring-offset-background",
                        )}
                        style={
                          thumb
                            ? { backgroundImage: `url(${thumb})` }
                            : { backgroundColor: c.hexCode ?? "var(--muted)" }
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col px-4 pb-10 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-lg font-normal uppercase tracking-widest text-foreground">
              {product.name.toUpperCase()}
            </h1>
            {colors.length > 1 ? (
              <button
                type="button"
                onClick={() => setIsColorMenuOpen((o) => !o)}
                className="flex shrink-0 items-center gap-1.5 border-0 bg-transparent p-0 text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-expanded={isColorMenuOpen}
                aria-controls="mobile-color-menu"
                aria-label={t("colorHeading", { name: selectedColor?.name ?? "" })}
              >
                <span className="text-sm font-semibold tabular-nums leading-none text-foreground">
                  {t("colorToggleMore", { count: colors.length - 1 })}
                </span>
                <span
                  className={cn(
                    "relative block h-7 w-7 shrink-0 overflow-hidden border border-border bg-muted bg-cover bg-center",
                    isColorMenuOpen &&
                      "ring-1 ring-foreground ring-offset-1 ring-offset-background",
                  )}
                  style={
                    selectedColor?.imageUrls?.[0]
                      ? { backgroundImage: `url(${selectedColor.imageUrls[0]})` }
                      : { backgroundColor: selectedColor?.hexCode ?? "var(--muted)" }
                  }
                  aria-hidden
                />
              </button>
            ) : null}
          </div>

          {colors.length === 0 && product.color ? (
            <p className="mt-4 text-sm text-muted-foreground">{product.color}</p>
          ) : null}

          <p className="mt-5 text-lg font-normal text-foreground">
            {onSale ? (
              <>
                <span className="text-muted-foreground line-through">{formatPrice(price)}</span>{" "}
                <span className="font-medium text-destructive">{formatPrice(displayPrice)}</span>
              </>
            ) : (
              formatPrice(displayPrice)
            )}
          </p>

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-foreground">{t("size")}</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const inStock = isSizeInStock(size);
                const stock = getStockForSize(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => inStock && setSelectedSize(size)}
                    disabled={!inStock}
                    className={cn(
                      "flex h-8 min-w-[2rem] items-center justify-center rounded-sm border px-2 text-sm font-medium uppercase tracking-wide transition-colors",
                      !inStock
                        ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground opacity-50"
                        : selectedSize === size
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:border-foreground",
                    )}
                    title={
                      !inStock ? t("outOfStockTitle") : stock > 0 ? t("inStockTitle", { count: stock }) : undefined
                    }
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {!hasAnyInStock && <p className="mt-4 text-sm text-destructive">{t("allOutOfStock")}</p>}

          <button
            type="button"
            onClick={handleAddToBag}
            disabled={!canAddToCart}
            className="mt-8 w-full bg-foreground py-4 text-sm font-bold uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("addToBag")}
          </button>
          {!selectedSize && hasAnyInStock && (
            <p className="mt-2 text-xs text-muted-foreground">{t("selectSizeHint")}</p>
          )}

          <ProductDetailAccordion
            productDescription={product.description}
            accordionCopy={productPageAccordionCopy}
          />

          {similarProducts.length > 0 ? (
            <section
              ref={similarSectionMobileRef}
              id="similar-items-mobile"
              className="mt-12 scroll-mt-8 border-t border-border pt-12"
            >
              <h2 className="mb-8 text-sm font-medium uppercase tracking-[0.2em] text-foreground">{t("similarItems")}</h2>
              <div className="grid grid-cols-2 gap-4">
                {similarProducts.map((p) => (
                  <div key={p.id} className="min-w-0">
                    <ProductCard
                      product={p}
                      variants={variantsByProductId[p.id] ?? []}
                      inWishlist={wishlistProductIds.includes(p.id)}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-1 md:gap-12 lg:grid-cols-2 lg:gap-20 xl:gap-28 lg:items-start">
        {/* Image gallery — desktop */}
        <div className="flex flex-col gap-4 lg:min-w-0 lg:pe-3 xl:pe-6 2xl:pe-8">
          <div>
            <div
              className="relative aspect-[2/3] overflow-hidden bg-muted group cursor-pointer"
              onClick={openLightbox}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openLightbox()}
              aria-label={t("viewFullImage")}
            >
              {mainSrc ? (
                <Image
                  src={mainSrc}
                  alt={product.description ? `${product.name} - ${product.description}` : product.name}
                  fill
                  className="object-cover"
                  onError={() => handleImageError(mainImageIndex)}

                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  {t("noImage")}
                </div>
              )}

              {/* Wishlist bookmark */}
              <button
                type="button"
                onClick={handleWishlistClick}
                className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center bg-white/90 text-foreground transition-colors hover:bg-white dark:bg-black/60 dark:hover:bg-black/80"
                aria-label={wishlistState ? t("wishlistRemove") : t("wishlistAdd")}
              >
                <WishlistBookmarkIcon active={wishlistState} className="w-5 h-5" />
              </button>

              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevImage();
                    }}
                    className="absolute start-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/80 text-foreground opacity-0 transition-opacity duration-200 hover:bg-white group-hover:opacity-100 dark:bg-black/60 dark:hover:bg-black/80"
                    aria-label={t("prevImage")}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextImage();
                    }}
                    className="absolute end-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/80 text-foreground opacity-0 transition-opacity duration-200 hover:bg-white group-hover:opacity-100 dark:bg-black/60 dark:hover:bg-black/80"
                    aria-label={t("nextImage")}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail grid - desktop only, swaps with main on click */}
            {hasMultipleImages && displayOrder.length > 1 && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {displayOrder.slice(1).map((urlIndex, i) => {
                  const position = i + 1;
                  const hasError = imageErrors[urlIndex];
                  const url = imageUrls[urlIndex];
                  return (
                    <button
                      key={urlIndex}
                      type="button"
                      onClick={() => handleThumbnailClick(position)}
                      className="relative aspect-[2/3] overflow-hidden bg-muted border-2 border-transparent transition-colors hover:border-muted-foreground/30"
                    >
                      {!hasError && url ? (
                        <Image
                          src={url}
                          alt={t("thumbAlt", { index: position, name: product.name })}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(urlIndex)}
                          sizes="(max-width: 1024px) 45vw, (max-width: 1536px) 32vw, 480px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                          —
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Product info — desktop only */}
        <div className="hidden md:flex flex-col lg:min-w-0 lg:ps-2 xl:ps-6 2xl:ps-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-normal text-foreground uppercase tracking-widest">
              {product.name.toUpperCase()}
            </h1>
            <button
              type="button"
              onClick={handleWishlistClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={wishlistState ? t("wishlistRemove") : t("wishlistAdd")}
            >
              <WishlistBookmarkIcon active={wishlistState} className="w-5 h-5" />
            </button>
          </div>

          {colors.length > 1 ? (
            <div className="mt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t("colorHeading", { name: selectedColor?.name ?? "" })}
              </p>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => {
                  const isSelected = selectedColor?.id === c.id;
                  const thumb = c.imageUrls?.[0] ?? null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleColorSelect(c)}
                      className={cn(
                        "box-border bg-background p-1.5 transition-colors rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isSelected ? "border-2 border-foreground" : "border border-border hover:border-foreground/35",
                      )}
                      title={c.name}
                      aria-label={t("selectColorAria", { name: c.name })}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="block h-8 w-8 bg-muted bg-cover bg-center"
                        style={
                          thumb
                            ? { backgroundImage: `url(${thumb})` }
                            : { backgroundColor: c.hexCode ?? "var(--muted)" }
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : colors.length === 0 && product.color ? (
            <p className="mt-4 text-sm text-muted-foreground">{product.color}</p>
          ) : null}

          {colors.length > 1 && imageUrls[0] ? (
            <div className="mt-4 aspect-square w-16 h-16 overflow-hidden border border-border">
              <Image
                src={imageUrls[0]}
                alt={t("selectedColorAlt", { name: selectedColor?.name ?? "" })}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          <p className="mt-6 text-lg font-normal text-foreground">
            {onSale ? (
              <>
                <span className="line-through text-muted-foreground">{formatPrice(price)}</span>{" "}
                <span className="text-destructive font-medium">{formatPrice(displayPrice)}</span>
              </>
            ) : (
              formatPrice(displayPrice)
            )}
          </p>

          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-foreground">{t("size")}</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const inStock = isSizeInStock(size);
                const stock = getStockForSize(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => inStock && setSelectedSize(size)}
                    disabled={!inStock}
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-none text-xs font-medium uppercase tracking-widest transition-colors ${!inStock
                      ? "border border-border text-muted-foreground opacity-50 cursor-not-allowed bg-muted/30"
                      : selectedSize === size
                        ? "bg-foreground text-background"
                        : "border border-border text-foreground hover:border-foreground"
                      }`}
                    title={
                      !inStock ? t("outOfStockTitle") : stock > 0 ? t("inStockTitle", { count: stock }) : undefined
                    }
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {!hasAnyInStock && (
            <p className="mt-4 text-sm text-destructive">{t("allOutOfStock")}</p>
          )}

          <button
            type="button"
            onClick={handleAddToBag}
            disabled={!canAddToCart}
            className="mt-10 w-full py-5 text-sm font-bold uppercase tracking-widest text-background bg-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("addToBag")}
          </button>
          {!selectedSize && hasAnyInStock && (
            <p className="mt-2 text-xs text-muted-foreground">{t("selectSizeHint")}</p>
          )}

          <ProductDetailAccordion
            productDescription={product.description}
            accordionCopy={productPageAccordionCopy}
          />
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          aria-modal="true"
          role="dialog"
          aria-label={t("galleryAria")}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center text-white/80 transition-colors hover:text-white"
            aria-label={tCommon("close")}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex h-full max-h-[90vh] w-full max-w-[95vw] items-center gap-4 px-4">
            <div className="scrollbar-hide hidden max-h-[90vh] w-16 shrink-0 flex-col gap-2 overflow-y-auto py-2 md:flex">
              {imageUrls.map((url, idx) => {
                const isSelected = lightboxIndex === idx;
                const hasError = imageErrors[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(idx);
                      setLightboxZoomed(false);
                      lightboxScrollRef.current?.scrollTo(0, 0);
                    }}
                    className={`w-16 flex-shrink-0 overflow-hidden transition-all duration-200 ${isSelected
                      ? "opacity-100 ring-2 ring-white ring-offset-2 ring-offset-black"
                      : "border border-white/20 opacity-60 hover:border-white/40 hover:opacity-80"
                      }`}
                  >
                    {!hasError && url ? (
                      <Image
                        src={url}
                        alt={t("thumbAlt", { index: idx + 1, name: product.name })}
                        width={64}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
              <div
                ref={lightboxScrollRef}
                className={cn(
                  "scrollbar-hide h-[85vh] w-full overflow-auto overscroll-contain px-8 select-none md:px-16",
                  lightboxZoomed
                    ? "touch-none flex cursor-grab items-start justify-start active:cursor-grabbing"
                    : "flex items-center justify-center",
                )}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (lightboxZoomed) handleLightboxDragStart(e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (dragRef.current) {
                    e.preventDefault();
                    handleLightboxDragMove(e.clientX, e.clientY);
                  }
                }}
                onMouseUp={() => handleLightboxDragEnd()}
                onMouseLeave={() => handleLightboxDragEnd()}
                onTouchStart={(e) => {
                  if (lightboxZoomed && e.touches.length === 1) {
                    handleLightboxDragStart(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (dragRef.current && e.touches.length === 1) {
                    e.preventDefault();
                    handleLightboxDragMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={() => handleLightboxDragEnd()}
              >
                <div
                  className={cn(
                    "flex items-center justify-center",
                    lightboxZoomed && "min-h-[110%] min-w-[110%] shrink-0",
                  )}
                >
                  {imageUrls[lightboxIndex] && !imageErrors[lightboxIndex] ? (
                    <Image
                      src={imageUrls[lightboxIndex]}
                      alt={t("zoomedAlt", { index: lightboxIndex + 1, name: product.name })}
                      width={1200}
                      height={1600}
                      className={cn(
                        "pointer-events-none select-none object-contain",
                        lightboxZoomed ? "h-[110%] w-[110%]" : "max-h-[85vh] max-w-full",
                      )}
                    />
                  ) : (
                    <div className="flex h-96 w-96 items-center justify-center bg-muted text-muted-foreground">
                      {t("noImage")}
                    </div>
                  )}
                </div>
              </div>

              {imageUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxPrev();
                    }}
                    className="absolute start-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/80 transition-colors hover:text-white"
                    aria-label={t("prevImage")}
                  >
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxNext();
                    }}
                    className="absolute end-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white/80 transition-colors hover:text-white"
                    aria-label={t("nextImage")}
                  >
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoomed((z) => !z);
                  requestAnimationFrame(() => lightboxScrollRef.current?.scrollTo(0, 0));
                }}
                className="absolute bottom-0 end-0 z-10 flex h-12 w-12 items-center justify-center rounded-none bg-white/20 text-white transition-colors hover:bg-white/30"
                aria-label={lightboxZoomed ? t("zoomOut") : t("zoomIn")}
              >
                {lightboxZoomed ? (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {similarProducts.length > 0 && (
        <section
          ref={similarSectionRef}
          id="similar-items"
          className="mt-24 hidden scroll-mt-8 border-t border-border pt-16 md:block"
        >
          <h2 className="mb-8 text-sm font-medium uppercase tracking-[0.2em] text-foreground">
            {t("similarItems")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {similarProducts.map((p) => (
              <div key={p.id} className="min-w-0">
                <ProductCard
                  product={p}
                  variants={variantsByProductId[p.id] ?? []}
                  inWishlist={wishlistProductIds.includes(p.id)}
                  compact
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sticky buy bar — appears when Similar Items section is in view (Bershka-style) */}
      <div
        ref={stickyBuyBarRef}
        className={cn(
          // Chrome mobile: avoid translucent blur + transform compositing glitches — solid base, blur only as enhancement
          "fixed inset-x-0 bottom-0 z-[70] isolate transform-gpu border-t border-border bg-background shadow-[0_-1px_0_0_var(--border)] md:z-40",
          "supports-[backdrop-filter]:bg-background/92 supports-[backdrop-filter]:backdrop-blur-md",
          "pb-[env(safe-area-inset-bottom,0px)] transition-[transform] duration-300 ease-out [backface-visibility:hidden]",
          "will-change-transform",
          showStickyBuyBar ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
        aria-hidden={!showStickyBuyBar}
      >
        <div className="mx-auto max-w-[min(100%,1680px)] px-4 py-2 sm:px-5 lg:px-6 xl:px-8">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 min-w-0">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-muted border border-border">
              {stickyThumbSrc ? (
                <Image
                  src={stickyThumbSrc}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                  —
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground truncate max-w-[min(100%,28rem)]">
                  {product.name}
                </p>
                <div className="shrink-0">{priceBlock}</div>
              </div>
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                {selectedColor?.name ?? product.color ?? ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 ms-auto sm:ms-0">
              {stickyBuyPhase === "pickSize" && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {sizes.map((size) => {
                    const inStock = isSizeInStock(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!inStock}
                        onClick={() => handleStickyBarSizeClick(size)}
                        className={cn(
                          "min-w-[2rem] px-2 py-1.5 text-[0.6rem] font-medium uppercase tracking-wider rounded-none border transition-colors",
                          !inStock
                            ? "border-border text-muted-foreground opacity-45 cursor-not-allowed bg-muted/20"
                            : "border-border text-foreground hover:border-foreground hover:bg-muted/40",
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={handleStickyBarAddClick}
                disabled={!hasAnyInStock}
                aria-expanded={stickyBuyPhase === "pickSize"}
                className="rounded-none bg-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {t("addToBag")}
              </button>
              <button
                type="button"
                onClick={handleWishlistClick}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-foreground hover:opacity-70"
                aria-label={wishlistState ? t("wishlistRemove") : t("wishlistAdd")}
              >
                <WishlistBookmarkIcon active={wishlistState} className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
