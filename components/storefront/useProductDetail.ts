"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useWishlist } from "@/context/WishlistContext";
import { getProductDisplayPrice, isProductOnSale, sortSizes } from "@/lib/utils";
import { META_PIXEL_CURRENCY, metaMoney } from "@/lib/analytics/meta-commerce";
import { trackMetaEvent } from "@/lib/analytics/meta-pixel-client";
import type { ProductPageAccordionResolved } from "@/actions/product-page-copy";
import type { ProductVariant, ProductColor, StorefrontProductResolved } from "@/db/schema";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

function usableImageUrls(urls: string[] | null | undefined): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter((url) => typeof url === "string" && url.trim().length > 0);
}

export interface ProductDetailProps {
  product: StorefrontProductResolved & { images?: string[] };
  variants: ProductVariant[];
  colors?: ProductColor[];
  inWishlist: boolean;
  similarProducts: StorefrontProductResolved[];
  variantsByProductId: Record<number, ProductVariant[]>;
  wishlistProductIds: number[];
  /** From URL — used for bag / product links */
  listStoreType: "streetwear" | "formal" | "women";
  productPageAccordionCopy: ProductPageAccordionResolved;
}

export function useProductDetail({
  product, variants, colors, inWishlist: initialInWishlist, listStoreType,
}: Pick<ProductDetailProps, "product" | "variants" | "inWishlist" | "listStoreType"> & { colors: ProductColor[] }) {
  const router = useRouter();
  const t = useTranslations("ProductDetail");
  const tNav = useTranslations("Navbar");
  const searchParams = useSearchParams();
  const { addToCart, openCart } = useCart();
  const { formatPrice } = useCurrency();
  const { isInWishlist, hasHydrated, toggleItem } = useWishlist();
  const wishlistState = hasHydrated ? isInWishlist(product.id) : initialInWishlist;
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const firstColor = colors[0];
  const colorFromUrl = searchParams.get("color");
  const initialColor =
    colorFromUrl && colors.find((c) => c.name.toLowerCase() === colorFromUrl.toLowerCase())
      ? colors.find((c) => c.name.toLowerCase() === colorFromUrl.toLowerCase())!
      : firstColor;
  const [selectedColor, setSelectedColorState] = useState<ProductColor | null>(initialColor ?? null);

  const imageUrls = useMemo(
    () => usableImageUrls(selectedColor?.imageUrls ?? product.images),
    [selectedColor?.imageUrls, product.images]
  );

  const handleColorSelect = useCallback((color: ProductColor) => {
    setSelectedColorState(color);
    setSelectedSize(null);
    // Shallow URL update — router.replace() would remount loading.tsx and jump scroll to top.
    const url = new URL(window.location.href);
    url.searchParams.set("color", color.name);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const price = typeof product.price === "string" ? product.price : String(product.price);
  const displayPrice = getProductDisplayPrice(product);
  const onSale = isProductOnSale(product);
  const viewContentSentFor = useRef<number | null>(null);

  useEffect(() => {
    if (viewContentSentFor.current === product.id) return;
    viewContentSentFor.current = product.id;
    trackMetaEvent(listStoreType, "ViewContent", {
      content_ids: [String(product.id)],
      content_type: "product",
      content_name: product.name,
      value: metaMoney(parseFloat(displayPrice)),
      currency: META_PIXEL_CURRENCY,
    });
  }, [listStoreType, product.id, product.name, displayPrice]);

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

  const addLineForSize = (size: string) => {
    if (!isSizeInStock(size)) return false;
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
    return true;
  };

  return {
    t, tNav, openCart, formatPrice, wishlistState, selectedSize, setSelectedSize,
    selectedColor, imageUrls, handleColorSelect, price, displayPrice, onSale,
    sizes, getStockForSize, isSizeInStock, hasAnyInStock, handleBack,
    handleWishlistClick, addLineForSize,
  };
}
