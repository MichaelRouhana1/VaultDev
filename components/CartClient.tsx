"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@clerk/nextjs";
import { useWishlist } from "@/context/WishlistContext";
import { getWishlistProductsData } from "@/actions/getWishlistProductsData";
import { ProductCard } from "@/components/ProductCard";
import { cn } from "@/lib/utils";
import type { Product, ProductColor, ProductVariant } from "@/db/schema";

const FREE_DELIVERY_THRESHOLD = 100;

function BagOrderSummaryBlocks({
  t,
  qualifiesForFreeDelivery,
  amountToFreeDelivery,
  formatPrice,
  totalPrice,
  onProcessOrder,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  qualifiesForFreeDelivery: boolean;
  amountToFreeDelivery: number;
  formatPrice: (n: number) => string;
  totalPrice: number;
  onProcessOrder: () => void;
}) {
  return (
    <>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-foreground sm:mb-2.5 sm:text-sm">
        {t("orderSummary")}
      </h2>

      {!qualifiesForFreeDelivery && amountToFreeDelivery > 0 && (
        <div className="mb-2 flex items-start gap-2 border border-blue-200/50 bg-blue-50 p-2.5 dark:border-blue-800/30 dark:bg-blue-950/30 sm:mb-2.5 sm:p-3 lg:mb-3">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 sm:h-5 sm:w-5"
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
          <p className="text-xs leading-snug text-blue-800 dark:text-blue-200 sm:text-sm">
            {t("addMoreFree", { amount: formatPrice(amountToFreeDelivery) })}
          </p>
        </div>
      )}

      {qualifiesForFreeDelivery && (
        <p className="mb-2 text-xs leading-snug text-green-700 dark:text-green-400 sm:mb-2.5 sm:text-sm lg:mb-3">
          {t("freeDelivery")}
        </p>
      )}

      <div className="flex items-center justify-between border-b border-t border-border py-2.5 sm:py-3 lg:py-3.5">
        <span className="text-sm text-muted-foreground lg:text-base">{t("totalVat")}</span>
        <span className="text-lg font-semibold tabular-nums text-foreground lg:text-xl">
          {formatPrice(totalPrice)}
        </span>
      </div>

      <button
        type="button"
        onClick={onProcessOrder}
        className="mt-2.5 w-full bg-primary py-3 text-xs font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 sm:mt-3 sm:py-3.5 sm:text-sm lg:mt-4 lg:py-4"
      >
        {t("processOrder")}
      </button>

      <label className="mt-4 flex cursor-pointer items-center gap-2 sm:mt-5 lg:mt-6">
        <input type="checkbox" className="rounded border-border" />
        <span className="text-xs text-muted-foreground sm:text-sm">{t("promoCheckbox")}</span>
      </label>
    </>
  );
}

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
  const { formatPrice } = useCurrency();
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
  const [bagSummaryPortalReady, setBagSummaryPortalReady] = useState(false);

  useEffect(() => {
    setBagSummaryPortalReady(true);
  }, []);

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

  const showBagFixedSummary = activeTab === "bag" && items.length > 0;

  const bagOrderSummaryNode = showBagFixedSummary ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] lg:hidden">
      <div className="pointer-events-auto border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(0,0,0,0.1)] backdrop-blur-md dark:shadow-[0_-6px_24px_rgba(0,0,0,0.35)] sm:px-6 sm:pt-3.5">
        <div className="mx-auto w-full max-w-[1400px] border-border bg-card/50 px-0 pt-2 sm:pt-3">
          <BagOrderSummaryBlocks
            t={t}
            qualifiesForFreeDelivery={qualifiesForFreeDelivery}
            amountToFreeDelivery={amountToFreeDelivery}
            formatPrice={formatPrice}
            totalPrice={totalPrice}
            onProcessOrder={handleProcessOrder}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 pt-4 pb-12 sm:pt-5 xl:max-w-[min(100%,92rem)] 2xl:max-w-[100rem]">
      <h1 className="sr-only">{t("srTitle")}</h1>
      <div className="mb-3 flex gap-4 border-b border-border sm:mb-4 sm:gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("bag")}
          className={`-mb-px pb-1 text-sm font-medium uppercase tracking-widest transition-colors sm:pb-1.5 ${
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
          className={`-mb-px pb-1 text-sm font-medium uppercase tracking-widest transition-colors sm:pb-1.5 ${
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
            <div className="lg:flex lg:items-start lg:gap-5 xl:gap-6">
              {/* Mobile / tablet: list + bottom dock; lg+: 4-col grid + compact sticky summary */}
              <div
                className={cn(
                  "flex min-w-0 flex-col gap-[1.125rem] sm:gap-6",
                  "lg:flex-1 lg:grid lg:grid-cols-4 lg:gap-3",
                  showBagFixedSummary && "pb-[min(52vh,21rem)] sm:pb-52 lg:pb-0",
                )}
              >
                {items.map((item) => (
                  <div
                    key={item.sku}
                    className={cn(
                      "flex flex-row gap-[1.125rem] border border-border bg-card/50 p-3 sm:gap-6 sm:p-[1.125rem]",
                      "lg:flex-col lg:gap-2 lg:p-2.5",
                    )}
                  >
                    <Link
                      href={`/${item.storeTypeForUrl ?? "streetwear"}/product/${item.productId}`}
                      className={cn(
                        "relative aspect-[3/4] w-[8.25rem] shrink-0 overflow-hidden bg-muted sm:w-[10.5rem]",
                        "lg:w-full lg:max-w-none",
                      )}
                    >
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productColor ? `${item.productName} in ${item.productColor}` : item.productName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1023px) 252px, 22vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-base text-muted-foreground">
                          —
                        </div>
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1 lg:gap-2 lg:py-0">
                      <div className="min-w-0">
                        <Link
                          href={`/${item.storeTypeForUrl ?? "streetwear"}/product/${item.productId}`}
                          className="line-clamp-2 text-base font-medium leading-snug text-foreground hover:opacity-60 sm:text-lg lg:text-sm"
                        >
                          {item.productName}
                        </Link>
                        <p className="mt-1.5 text-base font-semibold text-foreground sm:text-lg lg:mt-1 lg:text-sm">
                          {formatPrice(item.priceAtPurchase)}
                        </p>
                        {(item.productColor || item.size) && (
                          <p className="mt-1 text-sm text-muted-foreground sm:text-base lg:text-xs">
                            {item.size && <span>{item.size}</span>}
                            {item.productColor && item.size && " · "}
                            {item.productColor && <span>{item.productColor}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.sku, item.quantity - 1)
                            }
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-none border border-border text-sm text-foreground transition-colors hover:bg-muted sm:size-10 sm:text-base lg:size-8 lg:text-sm"
                            aria-label={t("decreaseQty")}
                          >
                            −
                          </button>
                          <span className="w-7 min-w-0 shrink-0 text-center text-sm font-medium tabular-nums text-foreground sm:w-8 sm:text-base lg:w-7 lg:text-sm">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.sku, item.quantity + 1)
                            }
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-none border border-border text-sm text-foreground transition-colors hover:bg-muted sm:size-10 sm:text-base lg:size-8 lg:text-sm"
                            aria-label={t("increaseQty")}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.sku)}
                          className="shrink-0 ps-1 text-end text-xs text-muted-foreground hover:text-destructive sm:text-sm"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {showBagFixedSummary ? (
                <aside className="hidden w-[16.25rem] shrink-0 border border-border bg-card/50 p-3.5 shadow-sm lg:sticky lg:top-20 lg:block xl:w-[17rem] xl:p-4">
                  <BagOrderSummaryBlocks
                    t={t}
                    qualifiesForFreeDelivery={qualifiesForFreeDelivery}
                    amountToFreeDelivery={amountToFreeDelivery}
                    formatPrice={formatPrice}
                    totalPrice={totalPrice}
                    onProcessOrder={handleProcessOrder}
                  />
                </aside>
              ) : null}
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

      {bagSummaryPortalReady &&
        showBagFixedSummary &&
        typeof document !== "undefined" &&
        createPortal(bagOrderSummaryNode, document.body)}
    </div>
  );
}
