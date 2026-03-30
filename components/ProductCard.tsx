"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import {
  getProductDisplayPrice,
  isProductOnSale,
  getProductDiscountPercent,
  sortSizes,
} from "@/lib/utils";
import type { Product } from "@/db/schema";
import type { ProductVariant, ProductColor } from "@/db/schema";
import { WishlistBookmarkIcon } from "@/components/WishlistBookmarkIcon";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

/** PDP URL segment when not inferrable from pathname (e.g. /cart). */
function storeTypeForProductUrl(product: Product): "streetwear" | "formal" {
  if (product.storeType === "formal") return "formal";
  return "streetwear";
}

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
  const { addToCart, openCart } = useCart();
  const { isInWishlist, hasHydrated, toggleItem } = useWishlist();

  const storeTypeMatch = pathname?.match(/^\/(streetwear|formal)/);
  const pathStoreType = storeTypeMatch?.[1] as "streetwear" | "formal" | undefined;
  const listStoreType = pathStoreType ?? storeTypeForProductUrl(product);
  const productUrl = `/${listStoreType}/product/${product.id}`;
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
      storeTypeForUrl: listStoreType,
    });
    openCart();
  };

  const colorLabel =
    activeColor?.name ?? product.color ?? product.description?.split(",")[0] ?? "—";

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

          {/* Wishlist bookmark */}
          <button
            type="button"
            onClick={handleWishlistClick}
            className={`absolute top-2 right-2 z-10 flex items-center justify-center bg-card/90 dark:bg-card/90 text-foreground hover:opacity-90 transition-colors ${compact ? "w-8 h-8" : "w-10 h-10"
              }`}
            aria-label={wishlistState ? "Remove from wishlist" : "Add to wishlist"}
          >
            <WishlistBookmarkIcon active={wishlistState} className={compact ? "w-4 h-4" : "w-5 h-5"} />
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
        <div className={`flex flex-col gap-0.5 ${compact ? "mt-2" : "mt-3"}`}>
          <h2
            className={`font-light text-foreground truncate ${compact ? "text-xs" : "text-sm"}`}
          >
            {product.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
            <p className="text-xs font-light text-muted-foreground shrink-0">
              {colorLabel}
              {hasMultipleColors && colors && (
                <span className="ml-1 text-muted-foreground">
                  +{colors.length - 1} {colors.length - 1 === 1 ? "Colour" : "Colours"}
                </span>
              )}
            </p>
            {hasMultipleColors && colors && (
              <div className="flex items-center gap-1.5 shrink-0">
                {colors.map((color, i) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={(e) => handleColorClick(e, i)}
                    className={`relative shrink-0 rounded-none overflow-hidden transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-foreground ${compact ? "size-3" : "size-4"
                      } ${i === selectedColorIndex ? "ring-1 ring-foreground ring-offset-0.5 ring-offset-background" : "border border-border"}`}
                    style={
                      color.hexCode ? { backgroundColor: color.hexCode } : undefined
                    }
                    aria-label={`Color: ${color.name}`}
                    aria-pressed={i === selectedColorIndex}
                  >
                    {!color.hexCode && color.imageUrls?.[0] && (
                      <span className="absolute inset-0 block overflow-hidden bg-muted">
                        <Image
                          src={color.imageUrls[0]}
                          alt={`${product.name} in ${color.name}`}
                          fill
                          className="object-cover"
                          sizes={compact ? "12px" : "16px"}
                        />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
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
      </Link>
    </article>
  );
}
