"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn, getProductDisplayPrice, isProductOnSale } from "@/lib/utils";
import { ProductDetailAccordion } from "@/components/ProductDetailAccordion";
import type { ProductPageAccordionResolved } from "@/actions/product-page-copy";
import type { Product, ProductVariant, ProductColor } from "@/db/schema";
import { WishlistBookmarkIcon } from "@/components/WishlistBookmarkIcon";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

interface ProductDetailClientProps {
  product: Product & { images?: string[] };
  variants: ProductVariant[];
  colors?: ProductColor[];
  inWishlist: boolean;
  similarProducts: Product[];
  variantsByProductId: Record<number, ProductVariant[]>;
  wishlistProductIds: number[];
  /** From URL — used for cart product links */
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
  const searchParams = useSearchParams();
  const { addToCart, openCart } = useCart();
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
  const [similarSectionInView, setSimilarSectionInView] = useState(false);
  const [stickyBuyPhase, setStickyBuyPhase] = useState<"summary" | "pickSize">("summary");

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

  useEffect(() => {
    setDisplayOrder(imageUrls.map((_, i) => i));
  }, [imageUrls, product.id, selectedColor?.id]);

  useEffect(() => {
    carouselApi?.scrollTo(0);
  }, [selectedColor?.id, imageUrls.length, carouselApi]);

  useEffect(() => {
    setStickyBuyPhase("summary");
  }, [selectedColor?.id]);

  useEffect(() => {
    if (similarProducts.length === 0) {
      setSimilarSectionInView(false);
      return;
    }
    const el = similarSectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        setSimilarSectionInView(entries.some((e) => e.isIntersecting));
      },
      { threshold: 0, rootMargin: "0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [similarProducts.length]);

  useEffect(() => {
    if (!similarSectionInView) setStickyBuyPhase("summary");
  }, [similarSectionInView]);

  const hasMultipleImages = imageUrls.length >= 2;

  const handleColorSelect = useCallback(
    (color: ProductColor) => {
      setSelectedColorState(color);
      setSelectedSize(null);
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
      ? [...new Set(variantsForColor.map((v) => v.size))].sort(
        (a, b) => DEFAULT_SIZES.indexOf(a) - DEFAULT_SIZES.indexOf(b)
      )
      : DEFAULT_SIZES;

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

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleItem(product.id);
  };

  const addLineForSize = (size: string) => {
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
    openCart();
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
    // Expand size chips only; cart opens after a size is chosen (see addLineForSize).
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

  const priceBlock = onSale ? (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className="line-through text-muted-foreground text-sm">${price}</span>
      <span className="text-destructive font-semibold">${displayPrice}</span>
    </span>
  ) : (
    <span className="text-sm font-semibold">${displayPrice}</span>
  );

  return (
    <main
      className={cn(
        "w-full max-w-[min(100%,1680px)] mx-auto px-4 sm:px-5 lg:px-6 xl:px-8 py-12 relative",
        showStickyBuyBar && "pb-20 md:pb-[4.75rem]",
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 xl:gap-28 lg:items-start">
        {/* Image gallery */}
        <div className="flex flex-col gap-4 lg:min-w-0 lg:pr-3 xl:pr-6 2xl:pr-8">
          {/* Mobile: peek carousel with dots */}
          <div className="md:hidden w-full relative">
            <button
              type="button"
              onClick={handleWishlistClick}
              className="absolute top-4 right-4 w-10 h-10 z-10 flex items-center justify-center bg-white/90 dark:bg-black/60 text-foreground hover:bg-white dark:hover:bg-black/80 transition-colors rounded-none"
              aria-label={wishlistState ? "Remove from wishlist" : "Add to wishlist"}
            >
              <WishlistBookmarkIcon active={wishlistState} className="w-5 h-5" />
            </button>
            <Carousel
              setApi={setCarouselApi}
              opts={{ align: "start", containScroll: "trimSnaps", loop: imageUrls.length > 1 }}
              className="w-full"
            >
              <CarouselContent className="flex gap-0">
                {imageUrls.map((url, idx) => {
                  const hasError = imageErrors[idx];
                  const src = !hasError && url ? url : null;
                  return (
                    <CarouselItem key={idx} className="basis-[80%] min-w-0 shrink-0 grow-0 pl-2 first:pl-0">
                      <div
                        className="relative aspect-[2/3] overflow-hidden bg-muted rounded-sm cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
                        onClick={() => {
                          setLightboxIndex(idx);
                          openLightbox();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && (setLightboxIndex(idx), openLightbox())}
                        aria-label="View full image"
                      >
                        {src ? (
                          <Image
                            src={src}
                            alt={product.description ? `${product.name} - ${product.description}` : product.name}
                            fill
                            className="object-cover"
                            onError={() => handleImageError(idx)}

                            sizes="(max-width: 768px) 80vw, 50vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                            No image
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselDots />
            </Carousel>
          </div>

          {/* Desktop: main image + arrows */}
          <div className="hidden md:block">
            <div
              className="relative aspect-[2/3] overflow-hidden bg-muted group cursor-pointer"
              onClick={openLightbox}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openLightbox()}
              aria-label="View full image"
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
                  No image
                </div>
              )}

              {/* Wishlist bookmark */}
              <button
                type="button"
                onClick={handleWishlistClick}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-black/60 text-foreground hover:bg-white dark:hover:bg-black/80 transition-colors z-10"
                aria-label={wishlistState ? "Remove from wishlist" : "Add to wishlist"}
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
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-black/60 text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-black/80"
                    aria-label="Previous image"
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-black/60 text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-black/80"
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Lightbox overlay */}
            {lightboxOpen && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                aria-modal="true"
                role="dialog"
                aria-label="Image gallery"
              >
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-4 w-full max-w-[95vw] max-h-[90vh] px-4">
                  {/* Vertical thumbnail strip -- hidden on mobile */}
                  <div className="hidden md:flex flex-col gap-2 overflow-y-auto max-h-[90vh] py-2 shrink-0 scrollbar-hide w-16">
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
                          className={`flex-shrink-0 w-16 h-20 overflow-hidden transition-all duration-200 ${isSelected
                            ? "ring-2 ring-white ring-offset-2 ring-offset-black opacity-100"
                            : "opacity-60 hover:opacity-80 border border-white/20 hover:border-white/40"
                            }`}
                        >
                          {!hasError && url ? (
                            <Image
                              src={url}
                              alt={`Thumbnail image ${idx + 1} of ${product.name}`}
                              width={64}
                              height={80}
                              className="w-full h-full object-cover"

                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                              —
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Main image area - px-16 reserves safe area for arrows (w-12 = 48px + 16px margin) */}
                  <div className="relative flex-1 min-w-0 flex items-center justify-center min-h-0 overflow-hidden">
                    <div
                      ref={lightboxScrollRef}
                      className={`w-full h-[85vh] overflow-auto overscroll-contain select-none scrollbar-hide px-16 ${lightboxZoomed
                        ? "flex items-start justify-start cursor-grab active:cursor-grabbing touch-none"
                        : "flex items-center justify-center"
                        }`}
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
                        className={`flex items-center justify-center ${lightboxZoomed ? "min-w-[110%] min-h-[110%] shrink-0" : ""}`}
                      >
                        {imageUrls[lightboxIndex] && !imageErrors[lightboxIndex] ? (
                          <Image
                            src={imageUrls[lightboxIndex]}
                            alt={`Zoomed image ${lightboxIndex + 1} of ${product.name}`}
                            width={1200}
                            height={1600}
                            className={`object-contain select-none pointer-events-none ${lightboxZoomed ? "w-[110%] h-[110%]" : "max-w-full max-h-[85vh]"
                              }`}

                          />
                        ) : (
                          <div className="w-96 h-96 bg-muted flex items-center justify-center text-muted-foreground">
                            No image
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
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10"
                          aria-label="Previous image"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            lightboxNext();
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/80 hover:text-white transition-colors z-10"
                          aria-label="Next image"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="absolute bottom-0 right-0 w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-none z-10 transition-colors"
                      aria-label={lightboxZoomed ? "Zoom out" : "Zoom in"}
                    >
                      {lightboxZoomed ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                          alt={`Thumbnail image ${position} of ${product.name}`}
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

        {/* Product info */}
        <div className="flex flex-col lg:min-w-0 lg:pl-2 xl:pl-6 2xl:pl-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-normal text-foreground uppercase tracking-widest">
              {product.name.toUpperCase()}
            </h1>
            <button
              type="button"
              onClick={handleWishlistClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={wishlistState ? "Remove from wishlist" : "Add to wishlist"}
            >
              <WishlistBookmarkIcon active={wishlistState} className="w-5 h-5" />
            </button>
          </div>

          {colors.length > 1 ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                Color — {selectedColor?.name ?? ""}
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
                      aria-label={`Select ${c.name}`}
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
                alt={`Selected color ${selectedColor?.name ?? ""}`.trim()}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          <p className="mt-6 text-lg font-normal text-foreground">
            {onSale ? (
              <>
                <span className="line-through text-muted-foreground">${price}</span>{" "}
                <span className="text-destructive font-medium">${displayPrice}</span>
              </>
            ) : (
              `$${displayPrice}`
            )}
          </p>

          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-widest text-foreground mb-3">Size</p>
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
                    className={`w-12 h-12 rounded-full text-xs font-medium uppercase tracking-widest transition-colors ${!inStock
                      ? "border border-border text-muted-foreground opacity-50 cursor-not-allowed bg-muted/30"
                      : selectedSize === size
                        ? "bg-foreground text-background"
                        : "border border-border text-foreground hover:border-foreground"
                      }`}
                    title={!inStock ? "Out of stock" : stock > 0 ? `${stock} in stock` : undefined}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {!hasAnyInStock && (
            <p className="mt-4 text-sm text-destructive">This product is currently out of stock.</p>
          )}

          <button
            type="button"
            onClick={handleAddToBag}
            disabled={!canAddToCart}
            className="mt-10 w-full py-5 text-sm font-bold uppercase tracking-widest text-background bg-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to bag
          </button>
          {!selectedSize && hasAnyInStock && (
            <p className="mt-2 text-xs text-muted-foreground">Please select a size</p>
          )}

          <ProductDetailAccordion
            productDescription={product.description}
            accordionCopy={productPageAccordionCopy}
          />
        </div>
      </div>

      {similarProducts.length > 0 && (
        <section
          ref={similarSectionRef}
          id="similar-items"
          className="mt-24 pt-16 border-t border-border scroll-mt-8"
        >
          <h2 className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-8">
            Similar Items
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
        className={cn(
          // Match Navbar glass: frosted strip when backdrop-filter is supported
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ease-out",
          showStickyBuyBar ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
        aria-hidden={!showStickyBuyBar}
      >
        <div className="max-w-[min(100%,1680px)] mx-auto px-4 sm:px-5 lg:px-6 xl:px-8 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
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
            <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto sm:ml-0">
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
                Add to basket
              </button>
              <button
                type="button"
                onClick={handleWishlistClick}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-foreground hover:opacity-70 rounded-none"
                aria-label={wishlistState ? "Remove from wishlist" : "Add to wishlist"}
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
