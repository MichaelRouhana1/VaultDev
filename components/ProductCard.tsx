"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useWishlist } from "@/context/WishlistContext";
import { ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  cn,
  getProductDisplayPrice,
  isProductOnSale,
  getProductDiscountPercent,
  sortSizes,
} from "@/lib/utils";
import type { Product, StorefrontProduct, StorefrontProductResolved } from "@/db/schema";
import type { ProductVariant, ProductColor } from "@/db/schema";
import { WishlistBookmarkIcon } from "@/components/WishlistBookmarkIcon";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

const MOBILE_ADD_TOAST_MS = 5000;
const MOBILE_ADD_TOAST_ANIM_MS = 300;

/** PDP URL segment when not inferrable from pathname (e.g. /bag). */
function storeTypeForProductUrl(product: Pick<Product, "storeType">): "streetwear" | "formal" {
  if (product.storeType === "formal") return "formal";
  return "streetwear";
}

interface ProductCardProps {
  /** Listing rows omit generated `searchVector` for RSC safety; PDP passes full `Product`. */
  product: StorefrontProduct | StorefrontProductResolved | Product;
  variants?: ProductVariant[];
  colors?: ProductColor[] | null;
  inWishlist?: boolean;
  compact?: boolean;
  /** Shop compact grid: hide title/price/tags below image on small screens only. */
  isCompactView?: boolean;
}

export function ProductCard({
  product,
  variants = [],
  colors,
  inWishlist = false,
  compact = false,
  isCompactView = false,
}: ProductCardProps) {
  const t = useTranslations("ProductCard");
  const tPdp = useTranslations("ProductDetail");
  const pathname = usePathname();
  const { addToCart, openCart } = useCart();
  const { formatPrice } = useCurrency();
  const { isInWishlist, hasHydrated, toggleItem } = useWishlist();

  const storeTypeMatch = pathname?.match(/^\/(streetwear|formal)/);
  const pathStoreType = storeTypeMatch?.[1] as "streetwear" | "formal" | undefined;
  const listStoreType = pathStoreType ?? storeTypeForProductUrl(product);
  const productUrl = `/${listStoreType}/product/${product.id}`;
  const wishlistState = hasHydrated ? isInWishlist(product.id) : inWishlist;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [mobileSizeSheetOpen, setMobileSizeSheetOpen] = useState(false);
  const [mobileAddedToast, setMobileAddedToast] = useState<{
    key: number;
    thumb: string | null;
  } | null>(null);
  const [mobileAddedToastVisible, setMobileAddedToastVisible] = useState(false);
  const [isColorTrayOpen, setIsColorTrayOpen] = useState(false);

  const hasMultipleColors = colors && colors.length > 1;
  const colorTrayId = `product-card-colors-${product.id}`;
  const activeColor = colors?.[selectedColorIndex];
  const imageUrls =
    activeColor?.imageUrls?.length
      ? activeColor.imageUrls
      : (product as { images?: string[] }).images ?? [];
  const hasMultipleImages = imageUrls.length > 1;
  const currentImage = imageUrls[currentImageIndex];
  const price = typeof product.price === "string" ? product.price : String(product.price);
  const displayPrice = getProductDisplayPrice(product);
  const onSale = isProductOnSale(product);
  const percentOff = getProductDiscountPercent(product);

  const variantsForColor =
    colors && activeColor
      ? variants.filter((v) => v.colorId === activeColor.id)
      : variants;
  const variantMap = new Map(variantsForColor.map((v) => [v.size, v]));
  const totalStock = variantsForColor.reduce((sum, v) => sum + v.stock, 0);
  const isOutOfStock = totalStock === 0;
  const isSizeInStock = (size: string) => (variantMap.get(size)?.stock ?? 0) > 0;

  const sizes = sortSizes(
    variantsForColor.length > 0
      ? [...new Set(variantsForColor.map((v) => v.size))]
      : [...DEFAULT_SIZES],
  );

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleItem(product.id);
  };

  const goToPrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length);
  };

  const goToNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((i) => (i + 1) % imageUrls.length);
  };

  const handleColorClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColorIndex(index);
    setCurrentImageIndex(0);
    setIsColorTrayOpen(false);
  };

  const addLineForSize = (size: string, openBag: boolean) => {
    if (!isSizeInStock(size)) return;
    const colorName = activeColor?.name ?? product.color ?? undefined;
    const productImage = imageUrls[0];
    const sku =
      colors && activeColor && colors.length > 1
        ? `${product.id}-${activeColor.id}-${size}`
        : undefined;
    addToCart({
      productId: product.id,
      size,
      quantity: 1,
      priceAtPurchase: displayPrice,
      productName: product.name,
      productImage,
      productColor: colorName,
      storeTypeForUrl: listStoreType,
      ...(sku ? { sku } : {}),
    });
    if (openBag) openCart();
  };

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    addLineForSize(size, true);
  };

  const showMobileAddedToast = () => {
    const thumb = imageUrls[0] ?? null;
    setMobileAddedToast((prev) => ({
      key: (prev?.key ?? 0) + 1,
      thumb,
    }));
  };

  useEffect(() => {
    if (!mobileAddedToast) return;
    setMobileAddedToastVisible(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setMobileAddedToastVisible(true));
    });
    const leaveTimer = window.setTimeout(() => {
      setMobileAddedToastVisible(false);
    }, MOBILE_ADD_TOAST_MS);
    const removeTimer = window.setTimeout(() => {
      setMobileAddedToast(null);
    }, MOBILE_ADD_TOAST_MS + MOBILE_ADD_TOAST_ANIM_MS);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [mobileAddedToast]);

  const handleMobileSheetPickSize = (size: string) => {
    if (!isSizeInStock(size)) return;
    addLineForSize(size, false);
    setMobileSizeSheetOpen(false);
    showMobileAddedToast();
  };

  const handleMobileBagClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setMobileSizeSheetOpen(true);
  };

  const handleMobileToastGoToBag = () => {
    setMobileAddedToast(null);
    setMobileAddedToastVisible(false);
    openCart();
  };

  const colorLabel =
    activeColor?.name ?? product.color ?? product.description?.split(",")[0] ?? "—";

  return (
    <article
      className={`group overflow-hidden ${compact ? "text-[0.85em]" : ""}`}
    >
      <Link
        href={productUrl}
        className="block"
        aria-label={t("viewDetailsAria", { name: product.name })}
      >
        <div
          className={cn(
            "relative aspect-[2/3] overflow-hidden bg-muted",
            isCompactView && "max-md:aspect-[20/31]",
          )}
        >
          {onSale && percentOff > 0 && (
            <span className="absolute top-2 start-2 z-10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-destructive text-destructive-foreground">
              -{percentOff}%
            </span>
          )}
          {currentImage ? (
            <Image
              src={currentImage}
              alt={product.description ? `${product.name} - ${product.description}` : product.name}
              fill
              className={cn(
                "object-cover transition-opacity duration-200",
                isOutOfStock && "opacity-70",
                isCompactView && "max-md:scale-[1.035] max-md:origin-top",
              )}
              sizes={
                isCompactView
                  ? "(max-width: 768px) 34vw, (max-width: 1200px) 20vw, 17vw"
                  : "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              }

            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <span className="text-sm">{t("noImage")}</span>
            </div>
          )}

          {/* Wishlist + mobile quick-add (bag) */}
          <div className="absolute top-2 end-2 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleWishlistClick}
              className={`flex items-center justify-center bg-card/90 dark:bg-card/90 text-foreground hover:opacity-90 transition-colors ${compact ? "h-8 w-8" : "h-10 w-10"
                }`}
              aria-label={wishlistState ? t("removeFromWishlistAria") : t("addToWishlistAria")}
            >
              <WishlistBookmarkIcon active={wishlistState} className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </button>
            <button
              type="button"
              onClick={handleMobileBagClick}
              disabled={isOutOfStock}
              aria-haspopup="dialog"
              aria-expanded={mobileSizeSheetOpen}
              className={`hidden items-center justify-center bg-card/90 text-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-card/90 max-md:flex ${compact ? "h-8 w-8" : "h-10 w-10"
                }`}
              aria-label={tPdp("mobileCartPickSize")}
            >
              <ShoppingBag className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
            </button>
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary/90 backdrop-blur-sm">
                {t("outOfStock")}
              </span>
            </div>
          )}

          {/* Image navigation arrows */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPrevImage}
                className={`pointer-events-none absolute start-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-card/80 text-foreground opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 hover:opacity-100 dark:bg-card/80 ${compact ? "h-8 w-8" : "h-10 w-10"
                  }`}
                aria-label={t("prevImageAria")}
              >
                <svg
                  className={compact ? "w-4 h-4" : "w-5 h-5"}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={goToNextImage}
                className={`pointer-events-none absolute end-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center bg-card/80 text-foreground opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 hover:opacity-100 dark:bg-card/80 ${compact ? "h-8 w-8" : "h-10 w-10"
                  }`}
                aria-label={t("nextImageAria")}
              >
                <svg
                  className={compact ? "w-4 h-4" : "w-5 h-5"}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Size selection overlay - theme-aware for dark mode */}
          {!isOutOfStock && (
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-border bg-card opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 ${compact ? "p-2" : "p-4"
                }`}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-foreground mb-2">
                {t("selectSize")}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const inStock = isSizeInStock(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={(e) => handleSizeClick(e, size)}
                      disabled={!inStock}
                      aria-label={inStock ? t("addToCartSizeAria", { size }) : undefined}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors ${inStock
                        ? "border border-foreground text-foreground hover:bg-foreground hover:text-primary-foreground"
                        : "border border-muted-foreground/40 text-muted-foreground/60 opacity-60 cursor-not-allowed line-through"
                        }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLOR TRAY (Slides up OVER the image container from the bottom) */}
          {hasMultipleColors && colors && (
            <div
              id={colorTrayId}
              className={cn(
                "absolute inset-x-0 bottom-0 z-[30] border-t border-border bg-background/95 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-transform duration-300 ease-in-out dark:bg-background/95 dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)]",
                isColorTrayOpen
                  ? "translate-y-0 opacity-100 pointer-events-auto"
                  : "translate-y-full opacity-0 pointer-events-none",
              )}
              aria-hidden={!isColorTrayOpen}
            >
              <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-2 py-1.5">
                {colors.map((color, i) => {
                  const isSelected = i === selectedColorIndex;
                  const thumb = color.imageUrls?.[0] ?? null;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={(e) => handleColorClick(e, i)}
                      className="shrink-0 rounded-none border-0 bg-transparent p-px transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      title={color.name}
                      aria-label={tPdp("selectColorAria", { name: color.name })}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={cn(
                          "relative block overflow-hidden rounded-sm border border-border",
                          compact ? "h-4 w-4" : "h-5 w-5",
                          isSelected &&
                            "ring-1 ring-foreground ring-offset-0.5 ring-offset-background",
                        )}
                        style={
                          thumb
                            ? {
                                backgroundImage: `url(${thumb})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : {
                                backgroundColor:
                                  color.hexCode ?? "var(--muted)",
                              }
                        }
                      >
                        {!thumb && !color.hexCode ? (
                          <span className="absolute inset-0 block bg-muted" />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* DETAILS SECTION */}
        <div
          className={cn(
            "flex flex-col gap-0.5",
            compact ? "mt-2" : "mt-3",
            isCompactView && "hidden md:block",
          )}
        >
          <h2
            className={`truncate font-light text-foreground ${compact ? "text-xs" : "text-sm"}`}
          >
            {product.name}
          </h2>

          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="shrink-0 text-xs font-light text-muted-foreground">
              {colorLabel}
            </p>

            {/* The unified +N toggle button */}
            {hasMultipleColors && colors && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsColorTrayOpen((o) => !o);
                }}
                className="flex shrink-0 items-center gap-1.5 border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                aria-expanded={isColorTrayOpen}
                aria-controls={colorTrayId}
                aria-label={tPdp("colorHeading", { name: activeColor?.name ?? colorLabel })}
              >
                {/* +N Text (NO BORDER) */}
                <span className="text-xs font-medium text-foreground">
                  +{colors.length - 1}
                </span>

                {/* Color Square (WITH BORDER) */}
                <span
                  className={cn(
                    "relative block overflow-hidden border border-border transition-transform hover:scale-105",
                    compact ? "h-3 w-3" : "h-4 w-4",
                    isColorTrayOpen &&
                      "ring-1 ring-foreground ring-offset-1 ring-offset-background",
                  )}
                  style={
                    activeColor?.hexCode
                      ? { backgroundColor: activeColor.hexCode }
                      : undefined
                  }
                >
                  {!activeColor?.hexCode && activeColor?.imageUrls?.[0] && (
                    <Image
                      src={activeColor.imageUrls[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes={compact ? "12px" : "16px"}
                    />
                  )}
                  {!activeColor?.hexCode &&
                    !activeColor?.imageUrls?.length && (
                      <span className="absolute inset-0 block bg-muted" />
                    )}
                </span>
              </button>
            )}
          </div>

          <p className="mt-0.5 text-sm font-light text-foreground">
            {onSale ? (
              <>
                <span className="line-through text-muted-foreground">{formatPrice(price)}</span>{" "}
                <span className="text-destructive font-medium">{formatPrice(displayPrice)}</span>
              </>
            ) : (
              formatPrice(displayPrice)
            )}
          </p>
        </div>
      </Link>

      <Sheet open={mobileSizeSheetOpen} onOpenChange={setMobileSizeSheetOpen}>
        <SheetContent side="bottom" className="gap-0 px-6 pb-8 pt-2">
          <SheetHeader className="border-b border-border pb-4 text-start">
            <SheetTitle>{tPdp("selectSizeSheetTitle")}</SheetTitle>
          </SheetHeader>
          <p className="pt-2 text-sm text-muted-foreground">{product.name}</p>
          <div className="flex flex-wrap gap-2 pt-4">
            {sizes.map((size) => {
              const inStock = isSizeInStock(size);
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!inStock}
                  onClick={() => handleMobileSheetPickSize(size)}
                  className={cn(
                    "min-h-12 min-w-12 rounded-full px-4 text-xs font-medium uppercase tracking-widest transition-colors",
                    !inStock
                      ? "cursor-not-allowed border border-border bg-muted/30 text-muted-foreground opacity-50"
                      : "border border-border text-foreground hover:border-foreground active:bg-foreground active:text-background",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {mobileAddedToast ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              "pointer-events-auto flex w-full max-w-lg items-center gap-3 border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm transition-transform duration-300 ease-out",
              mobileAddedToastVisible ? "translate-y-0" : "translate-y-[calc(100%+2.5rem)]",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-muted">
                {mobileAddedToast.thumb ? (
                  <Image
                    src={mobileAddedToast.thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                    —
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">{tPdp("addedToBag")}</p>
            </div>
            <button
              type="button"
              onClick={handleMobileToastGoToBag}
              className="shrink-0 rounded-none border border-foreground bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {tPdp("goToBag")}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
