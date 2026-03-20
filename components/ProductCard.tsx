"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountPercent } from "@/lib/utils";
import type { Product } from "@/db/schema";
import type { ProductVariant, ProductColor } from "@/db/schema";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

interface ProductCardProps {
  product: Product;
  variants?: ProductVariant[];
  colors?: ProductColor[] | null;
  inWishlist?: boolean;
  compact?: boolean;
}

export function ProductCard({
  product,
  variants = [],
  colors,
  inWishlist = false,
  compact = false,
}: ProductCardProps) {
  const pathname = usePathname();
  const posthog = usePostHog();
  const { addToCart, openCart } = useCart();
  const { isInWishlist, hasHydrated, toggleItem } = useWishlist();

  const storeTypeMatch = pathname?.match(/^\/(streetwear|formal)/);
  const storeType = storeTypeMatch ? storeTypeMatch[1] : null;
  const productUrl = storeType ? `/${storeType}/product/${product.id}` : `/shop/${product.id}`;
  const wishlistState = hasHydrated ? isInWishlist(product.id) : inWishlist;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const hasMultipleColors = colors && colors.length > 1;
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

  const sizes =
    variantsForColor.length > 0
      ? [...new Set(variantsForColor.map((v) => v.size))].sort(
        (a, b) => DEFAULT_SIZES.indexOf(a) - DEFAULT_SIZES.indexOf(b)
      )
      : DEFAULT_SIZES;

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
  };

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSizeInStock(size)) return;
    const colorName = activeColor?.name ?? product.color ?? undefined;
    const productImage = imageUrls[0];
    addToCart({
      productId: product.id,
      size,
      quantity: 1,
      priceAtPurchase: displayPrice,
      productName: product.name,
      productImage,
      productColor: colorName,
    });
    try {
      posthog?.capture("add_to_cart", {
        product_id: product.id,
        product_name: product.name,
        price: displayPrice,
        size,
        color: colorName,
        store_type: product.storeType,
      });
    } catch {
      // Graceful degradation
    }
    openCart();
  };

  const colorLabel =
    activeColor?.name ?? product.color ?? product.description?.split(",")[0] ?? product.category ?? "—";

  return (
    <article
      className={`group overflow-hidden ${compact ? "text-[0.85em]" : ""}`}
    >
      <Link href={productUrl} className="block">
        <div
          className={`relative aspect-[2/3] overflow-hidden bg-muted ${compact ? "" : ""
            }`}
        >
          {onSale && percentOff > 0 && (
            <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-destructive text-destructive-foreground">
              -{percentOff}%
            </span>
          )}
          {currentImage ? (
            <Image
              src={currentImage}
              alt={product.description ? `${product.name} - ${product.description}` : product.name}
              fill
              className={`object-cover transition-opacity duration-200 ${isOutOfStock ? "opacity-70" : ""
                }`}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"

            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <span className="text-sm">No image</span>
            </div>
          )}

          {/* Wishlist heart - theme-aware */}
          <button
            type="button"
            onClick={handleWishlistClick}
            className={`absolute top-2 right-2 z-10 flex items-center justify-center bg-card/90 dark:bg-card/90 text-foreground hover:opacity-90 transition-colors ${compact ? "w-8 h-8" : "w-10 h-10"
              }`}
            aria-label={wishlistState ? "Remove from wishlist" : "Add to wishlist"}
          >
            {wishlistState ? (
              <svg
                className={compact ? "w-4 h-4" : "w-5 h-5"}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg
                className={compact ? "w-4 h-4" : "w-5 h-5"}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </button>

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary/90 backdrop-blur-sm">
                Out of stock
              </span>
            </div>
          )}

          {/* Image navigation arrows */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPrevImage}
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-card/80 dark:bg-card/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100 ${compact ? "w-8 h-8" : "w-10 h-10"
                  }`}
                aria-label="Previous image"
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
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-card/80 dark:bg-card/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:opacity-100 ${compact ? "w-8 h-8" : "w-10 h-10"
                  }`}
                aria-label="Next image"
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
              className={`absolute inset-x-0 bottom-0 bg-card border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${compact ? "p-2" : "p-4"
                }`}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-foreground mb-2">
                Select size
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
        </div>
        <div className={`flex items-start justify-between gap-2 ${compact ? "mt-2" : "mt-3"}`}>
          <div className="min-w-0 flex-1">
            <h2
              className={`font-light text-foreground truncate ${compact ? "text-xs" : "text-sm"
                }`}
            >
              {product.name}
            </h2>
            <p className="text-xs font-light text-muted-foreground mt-0.5">
              {colorLabel}
              {hasMultipleColors && colors && (
                <span className="ml-1 text-muted-foreground">
                  +{colors.length - 1} {colors.length - 1 === 1 ? "Colour" : "Colours"}
                </span>
              )}
            </p>
            <p className="text-sm font-light text-foreground mt-0.5">
              {onSale ? (
                <>
                  <span className="line-through text-muted-foreground">${price}</span>{" "}
                  <span className="text-destructive font-medium">${displayPrice}</span>
                </>
              ) : (
                `$${displayPrice}`
              )}
            </p>
          </div>
          {/* Color bubbles on the right - visible only on hover */}
          {hasMultipleColors && colors && (
            <div className="flex items-center gap-1.5 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {colors.map((color, i) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={(e) => handleColorClick(e, i)}
                  className={`relative shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground ${compact ? "w-4 h-4" : "w-5 h-5"
                    } ${i === selectedColorIndex ? "border border-foreground" : "border-2 border-border"}`}
                  style={
                    color.hexCode
                      ? { backgroundColor: color.hexCode }
                      : undefined
                  }
                  aria-label={`Color: ${color.name}`}
                  aria-pressed={i === selectedColorIndex}
                >
                  {!color.hexCode && color.imageUrls?.[0] && (
                    <span className="absolute inset-0 block rounded-full overflow-hidden bg-muted">
                      <Image
                        src={color.imageUrls[0]}
                        alt={`${product.name} in ${color.name}`}
                        fill
                        className="object-cover"

                        sizes="20px"
                      />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
