"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@clerk/nextjs";
import { useWishlist } from "@/context/WishlistContext";
import { getWishlistProductsData } from "@/actions/getWishlistProductsData";
import { ProductCard } from "@/components/ProductCard";
import type { Product, ProductColor, ProductVariant } from "@/db/schema";

const FREE_DELIVERY_THRESHOLD = 100;

type Tab = "bag" | "favorites";

interface CartClientProps {
  wishlistProducts: Product[];
  wishlistProductIds: number[];
  variantsByProductId: Record<number, ProductVariant[]>;
  wishlistColorsByProductId: Record<number, ProductColor[]>;
}

export function CartClient({
  wishlistProducts,
  wishlistProductIds,
  variantsByProductId,
  wishlistColorsByProductId,
}: CartClientProps) {
  const router = useRouter();
  const t = useTranslations("Bag");
  const searchParams = useSearchParams();
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const { isSignedIn } = useAuth();
  const { wishlistIds, hasHydrated } = useWishlist();
  const [activeTab, setActiveTab] = useState<Tab>("bag");
  const [guestWishlistProducts, setGuestWishlistProducts] = useState<Product[]>([]);
  const [guestVariantsByProductId, setGuestVariantsByProductId] = useState<
    Record<number, ProductVariant[]>
  >({});
  const [guestColorsByProductId, setGuestColorsByProductId] = useState<
    Record<number, ProductColor[]>
  >({});

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "favorites" || tab === "favourites") {
      setActiveTab("favorites");
    } else if (tab === "bag" || tab === "basket") {
      setActiveTab("bag");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hasHydrated || isSignedIn) {
      setGuestWishlistProducts([]);
      setGuestVariantsByProductId({});
      setGuestColorsByProductId({});
      return;
    }
    if (wishlistIds.length === 0) {
      setGuestWishlistProducts([]);
      setGuestVariantsByProductId({});
      setGuestColorsByProductId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const data = await getWishlistProductsData(wishlistIds);
      if (!cancelled) {
        setGuestWishlistProducts(data.products);
        setGuestVariantsByProductId(data.variantsByProductId);
        setGuestColorsByProductId(data.colorsByProductId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isSignedIn, wishlistIds]);

  const displayWishlistProducts = isSignedIn ? wishlistProducts : guestWishlistProducts;
  const displayVariantsByProductId = isSignedIn ? variantsByProductId : guestVariantsByProductId;
  const displayColorsByProductId = isSignedIn ? wishlistColorsByProductId : guestColorsByProductId;
  const favouritesCount = isSignedIn ? wishlistProductIds.length : wishlistIds.length;

  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - totalPrice);
  const qualifiesForFreeDelivery = totalPrice >= FREE_DELIVERY_THRESHOLD;

  const handleProcessOrder = () => {
    const cart = items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity,
      priceAtPurchase: i.priceAtPurchase,
      productName: i.productName,
      ...(i.productImage ? { productImage: i.productImage } : {}),
      ...(i.productColor ? { productColor: i.productColor } : {}),
    }));
    router.push(`/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-12">
      <h1 className="sr-only">{t("srTitle")}</h1>
      <div className="mb-12 flex gap-8 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("bag")}
          className={`-mb-px pb-4 text-sm font-medium uppercase tracking-widest transition-colors ${
            activeTab === "bag"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabBag", { count: items.length })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={`-mb-px pb-4 text-sm font-medium uppercase tracking-widest transition-colors ${
            activeTab === "favorites"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabFavourites", {
            count: hasHydrated ? favouritesCount : isSignedIn ? wishlistProductIds.length : 0,
          })}
        </button>
      </div>

      {activeTab === "bag" && (
        <>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-border py-16">
              <p className="mb-4 text-muted-foreground">{t("emptyBag")}</p>
              <Link
                href="/shop"
                className="border-b border-foreground pb-1 text-sm font-normal text-foreground hover:opacity-60"
              >
                {t("continueShopping")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(340px,400px)] gap-8 lg:gap-12">
              {/* Product grid - 4 per row */}
              <div className="min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {items.map((item) => (
                  <div
                    key={item.sku}
                    className="flex flex-col bg-card/50 border border-border p-4"
                  >
                    <Link
                      href={`/${item.storeTypeForUrl ?? "streetwear"}/product/${item.productId}`}
                      className="aspect-[3/4] overflow-hidden bg-muted relative block"
                    >
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productColor ? `${item.productName} in ${item.productColor}` : item.productName}
                          fill
                          className="object-cover"

                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                          —
                        </div>
                      )}
                    </Link>
                    <Link
                      href={`/${item.storeTypeForUrl ?? "streetwear"}/product/${item.productId}`}
                      className="text-sm font-medium text-foreground hover:opacity-60 mt-3 line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      ${parseFloat(item.priceAtPurchase).toFixed(2)}
                    </p>
                    {(item.productColor || item.size) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.size && <span>{item.size}</span>}
                        {item.productColor && item.size && " · "}
                        {item.productColor && <span>{item.productColor}</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.sku, item.quantity - 1)
                        }
                        className="w-9 h-9 flex items-center justify-center border border-border text-foreground font-medium hover:bg-muted transition-colors"
                        aria-label={t("decreaseQty")}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.sku, item.quantity + 1)
                        }
                        className="w-9 h-9 flex items-center justify-center border border-border text-foreground font-medium hover:bg-muted transition-colors"
                        aria-label={t("increaseQty")}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.sku)}
                        className="ms-auto text-xs text-muted-foreground hover:text-destructive"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Order summary */}
              <div>
                <div className="sticky top-24 border border-border p-6 bg-card/50">
                  <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground">
                    {t("orderSummary")}
                  </h2>

                  {!qualifiesForFreeDelivery && amountToFreeDelivery > 0 && (
                    <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        {t("addMoreFree", { amount: amountToFreeDelivery.toFixed(2) })}
                      </p>
                    </div>
                  )}

                  {qualifiesForFreeDelivery && (
                    <p className="mb-4 text-xs text-green-700 dark:text-green-400">{t("freeDelivery")}</p>
                  )}

                  <div className="flex items-center justify-between border-b border-t border-border py-4">
                    <span className="text-sm text-muted-foreground">{t("totalVat")}</span>
                    <span className="text-lg font-semibold text-foreground">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessOrder}
                    className="mt-6 w-full bg-primary py-4 text-xs font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {t("processOrder")}
                  </button>

                  <label className="mt-6 flex cursor-pointer items-center gap-2">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-xs text-muted-foreground">{t("promoCheckbox")}</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "favorites" && (
        <>
          {!hasHydrated ? (
            <div className="flex flex-col items-center justify-center border border-border py-16">
              <p className="text-muted-foreground">{t("loadingFavourites")}</p>
            </div>
          ) : displayWishlistProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-border py-16">
              <p className="mb-4 text-muted-foreground">{t("noFavourites")}</p>
              <p className="mb-4 max-w-sm text-center text-xs text-muted-foreground">{t("favouritesHint")}</p>
              <Link
                href="/streetwear/shop"
                className="border-b border-foreground pb-1 text-sm font-normal text-foreground hover:opacity-60"
              >
                {t("continueShopping")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {displayWishlistProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variants={displayVariantsByProductId[product.id] ?? []}
                  colors={displayColorsByProductId[product.id] ?? []}
                  inWishlist
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
