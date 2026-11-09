"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { cn } from "@/lib/utils";
import { ProductDetailAccordion } from "@/components/ProductDetailAccordion";
import { ProductPhotoStrip, ProductPhotoViewer, type ProductPhoto } from "@/components/storefront/ProductPhotoGallery";
import { useOpenProductZoom, type ProductZoomSession } from "@/components/storefront/ProgressiveZoomPhoto";
import { ProductImage } from "@/components/storefront/ProductImage";
import type { ProductColor } from "@/db/schema";
import type { useProductDetail, ProductDetailProps } from "@/components/storefront/useProductDetail";
import { WishlistBookmarkIcon } from "@/components/WishlistBookmarkIcon";
import { useProductStickyBuybar } from "@/components/storefront/useProductStickyBuybar";
import { OldProductDetailClient } from "@/components/storefront/OldProductDetailClient";
import { RotateCcw, Truck } from "lucide-react";
import styles from "@/components/storefront/product-detail.module.css";

export function ProductDetailClient(props: ProductDetailProps) {
  return (
    <OldProductDetailClient
      {...props}
      renderDesktop={(details) => <NewProductDetailDesktop {...props} details={details} />}
    />
  );
}

function NewProductDetailDesktop({
  product,
  colors = [],
  similarProducts,
  variantsByProductId,
  wishlistProductIds,
  productPageAccordionCopy,
  details,
}: ProductDetailProps & { details: ReturnType<typeof useProductDetail> }) {
  const {
    t, formatPrice, wishlistState, selectedSize, setSelectedSize,
    selectedColor, imageUrls, handleColorSelect: selectProductColor, price, displayPrice, onSale,
    sizes, getStockForSize, isSizeInStock, hasAnyInStock,
    handleWishlistClick, addLineForSize: addCartLine,
  } = details;
  const [imageErrorsKey, setImageErrorsKey] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [photoViewer, setPhotoViewer] = useState<{ photos: ProductPhoto[]; index: number; session: ProductZoomSession } | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement>(null);
  const similarSectionRef = useRef<HTMLElement | null>(null);
  const stickyBuyBarRef = useRef<HTMLDivElement | null>(null);
  const [similarSectionInView, setSimilarSectionInView] = useState(false);
  const [stickyBuyPhase, setStickyBuyPhase] = useState<"summary" | "pickSize">("summary");
  const [sizeRequested, setSizeRequested] = useState(false);

  const galleryKey = `${product.id}:${selectedColor?.id ?? "none"}:${imageUrls.join("\0")}`;
  const prepareProductZoom = useOpenProductZoom(galleryKey);
  if (imageErrorsKey !== galleryKey) {
    setImageErrorsKey(galleryKey);
    setImageErrors({});
    setPhotoViewer(null);
  }
  const photos = useMemo(
    () => imageUrls.flatMap((src, index) => imageErrors[index] ? [] : [{ src, index }]),
    [imageUrls, imageErrors],
  );

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
    const observe = () => {
      if (similarSectionRef.current) io.observe(similarSectionRef.current);
    };
    observe();
    const raf = requestAnimationFrame(observe);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [similarProducts.length]);

  useEffect(() => {
    if (!similarSectionInView) setStickyBuyPhase("summary");
  }, [similarSectionInView]);

  const handleColorSelect = (color: ProductColor) => {
    selectProductColor(color);
    setSizeRequested(false);
  };

  const handleImageError = (index: number) => {
    setImageErrors((previous) => previous[index] ? previous : { ...previous, [index]: true });
  };

  const openPhotoViewer = (index: number, trigger: HTMLButtonElement) => {
    const photo = photos.find((photo) => photo.index === index);
    if (!photo) return;
    prepareProductZoom(photo.src, (session) => {
      photoTriggerRef.current = trigger;
      setPhotoViewer({ photos, index, session });
    });
  };

  const addLineForSize = (size: string) => {
    if (addCartLine(size)) setStickyBuyPhase("summary");
  };

  const handleAddToBag = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedSize && isSizeInStock(selectedSize)) {
      addLineForSize(selectedSize);
      return;
    }

    setSizeRequested(true);
    event.currentTarget.closest("section")
      ?.querySelector<HTMLButtonElement>("[data-product-size]:not(:disabled)")?.focus();
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

  const mainPhoto = photos[0];
  const colorName = selectedColor?.name ?? product.color;
  const stickyThumbSrc = imageUrls[0] && !imageErrors[0] ? imageUrls[0] : null;
  const showStickyBuyBar = similarProducts.length > 0 && similarSectionInView && !photoViewer;

  useProductStickyBuybar(stickyBuyBarRef, showStickyBuyBar, "(min-width: 768px)");

  const priceBlock = onSale ? (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className="text-destructive font-semibold">{formatPrice(displayPrice)}</span>
      <span className="text-sm text-foreground/65 line-through">{formatPrice(price)}</span>
    </span>
  ) : (
    <span className="text-sm font-semibold">{formatPrice(displayPrice)}</span>
  );

  const renderPurchasePanel = () => (
    <section
      className={cn(styles.purchase, "relative shrink-0 bg-background/85 text-foreground backdrop-blur-xl")}
      aria-labelledby="product-title-desktop"
    >
      <div className="px-5 pb-5 pt-5 md:p-6">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleWishlistClick}
            className="inline-grid size-8 place-items-center transition-opacity hover:opacity-65 focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={wishlistState ? t("wishlistRemove") : t("wishlistAdd")}
          >
            <WishlistBookmarkIcon active={wishlistState} className="size-4" />
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 id="product-title-desktop" className="min-w-0 text-sm font-bold uppercase leading-5">
            {product.name}
          </h1>
          <div className="max-w-[45%] shrink-0 text-end text-sm font-bold">{priceBlock}</div>
        </div>

        {(colors.length > 0 || colorName) && (
          <div className="mt-5">
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("colorHeading", { name: colorName ?? "" })}>
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      "relative grid size-8 place-items-center border p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selectedColor?.id === color.id ? "border-foreground" : "border-foreground/35 hover:border-foreground",
                    )}
                    title={color.name}
                    aria-label={t("selectColorAria", { name: color.name })}
                    aria-pressed={selectedColor?.id === color.id}
                  >
                    <span className="relative block size-full overflow-hidden" style={{ backgroundColor: color.hexCode ?? "var(--muted)" }}>
                      {!color.hexCode && color.imageUrls?.[0] && (
                        <ProductImage variant="thumbnail" src={color.imageUrls[0]} alt="" fill sizes="24px" className="object-cover" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {colorName && <p className="mt-2 text-[11px] font-semibold uppercase">{colorName}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-foreground/10 px-5 pb-5 pt-5 md:p-6">
        <p id="product-size-desktop" className="text-xs font-bold uppercase">{t("size")}</p>
        <div role="group" aria-labelledby="product-size-desktop" className="-ms-1.5 mt-1.5 flex flex-wrap gap-x-1 gap-y-0.5">
          {sizes.map((size) => {
            const inStock = isSizeInStock(size);
            return (
              <button
                key={size}
                type="button"
                data-product-size
                disabled={!inStock}
                aria-pressed={selectedSize === size}
                title={inStock ? t("inStockTitle", { count: getStockForSize(size) }) : t("outOfStockTitle")}
                onClick={() => {
                  setSelectedSize(size);
                  setSizeRequested(false);
                }}
                className={cn(
                  "min-h-10 min-w-9 border border-transparent px-1.5 text-xs font-semibold uppercase focus-visible:outline-2 focus-visible:outline-ring md:min-w-10",
                  !inStock ? "text-muted-foreground line-through opacity-65" : "hover:border-foreground/40",
                  selectedSize === size && "border-foreground hover:border-foreground",
                )}
              >
                {size}
              </button>
            );
          })}
        </div>

        {sizeRequested && !selectedSize && hasAnyInStock && (
          <p role="alert" className="mt-1 text-xs text-destructive">{t("selectSizeHint")}</p>
        )}
        {!hasAnyInStock && <p className="mt-1 text-xs text-destructive">{t("allOutOfStock")}</p>}
        <button
          type="button"
          onClick={handleAddToBag}
          disabled={!hasAnyInStock}
          className="mt-4 min-h-10 w-full bg-foreground px-3 py-2 text-sm font-bold uppercase text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
        >
          {t("addToBag")}
        </button>

        <div className="mt-3 flex flex-col items-start gap-1 text-xs">
          {([
            ["shipping", Truck, t("detailsShipping")],
            ["returns", RotateCcw, t("detailsReturns")],
          ] as const).map(([key, Icon, label]) => (
            <a
              key={key}
              href={`#product-details-desktop-${key}`}
              onClick={(event) => {
                const trigger = document.getElementById(`product-details-desktop-${key}`);
                if (!trigger) return;
                event.preventDefault();
                if (trigger.getAttribute("aria-expanded") === "false") trigger.click();
                trigger.focus();
              }}
              className="inline-flex items-center gap-2 py-0.5 hover:underline"
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <div
      className={cn(
        styles.layout,
        "relative hidden w-full md:block md:pb-12",
        showStickyBuyBar && "pb-20 md:pb-[4.75rem]",
      )}
    >
      <div className={cn(styles.hero, "relative isolate hidden overflow-hidden bg-muted md:flex md:items-end md:justify-end")}>
        <div className="absolute inset-0">
          <ProductPhotoStrip
            key={galleryKey}
            photos={photos}
            name={product.name}
            onExpand={openPhotoViewer}
            onImageError={handleImageError}
          />
        </div>
        {renderPurchasePanel()}
      </div>

      <section className={cn("hidden items-center md:grid", mainPhoto ? styles.details : "grid-cols-1")}>
        {mainPhoto && (
          <button
            type="button"
            onClick={(event) => openPhotoViewer(mainPhoto.index, event.currentTarget)}
            aria-label={t("viewFullImage")}
            className="relative block aspect-[.78] w-full cursor-zoom-in overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
          >
            <ProductImage
              variant="pdp"
              key={mainPhoto.src}
              src={mainPhoto.src}
              data-gallery-photo={mainPhoto.src}
              alt={product.name}
              fill
              sizes="min(max(350px, calc((100svh - 56px) * .78), 20vw), 46vw)"
              className="object-cover"
              onError={() => handleImageError(mainPhoto.index)}
            />
          </button>
        )}
        <div className="px-[clamp(1.5rem,10.5vw,14rem)] py-12">
          <ProductDetailAccordion
            id="product-details-desktop"
            productDescription={product.description}
            accordionCopy={productPageAccordionCopy}
          />
        </div>
      </section>

      {photoViewer && (
        <ProductPhotoViewer
          photos={photoViewer.photos}
          name={product.name}
          startIndex={photoViewer.index}
          session={photoViewer.session}
          onClose={() => setPhotoViewer(null)}
          restoreFocus={() => photoTriggerRef.current?.focus({ preventScroll: true })}
        />
      )}

      {similarProducts.length > 0 && (
        <section
          ref={similarSectionRef}
          id="similar-items"
          className="mx-auto mt-16 hidden max-w-[1680px] scroll-mt-8 border-t border-border px-5 pt-16 md:block lg:px-8"
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
                <ProductImage
                  variant="thumbnail"
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
    </div>
  );
}
