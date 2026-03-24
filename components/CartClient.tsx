"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@clerk/nextjs";
import { useWishlist } from "@/context/WishlistContext";
import { getWishlistProductsData } from "@/actions/getWishlistProductsData";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/db/schema";
import type { ProductVariant } from "@/db/schema";

const FREE_DELIVERY_THRESHOLD = 100;

type Tab = "basket" | "favorites";

interface CartClientProps {
  wishlistProducts: Product[];
  wishlistProductIds: number[];
  variantsByProductId: Record<number, ProductVariant[]>;
}

export function CartClient({
  wishlistProducts,
  wishlistProductIds,
  variantsByProductId,
}: CartClientProps) {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const { isSignedIn } = useAuth();
  const { wishlistIds, hasHydrated } = useWishlist();
  const [activeTab, setActiveTab] = useState<Tab>("basket");
  const [guestWishlistProducts, setGuestWishlistProducts] = useState<Product[]>([]);
  const [guestVariantsByProductId, setGuestVariantsByProductId] = useState<
    Record<number, ProductVariant[]>
  >({});

  useEffect(() => {
    if (!hasHydrated || isSignedIn) {
      setGuestWishlistProducts([]);
      setGuestVariantsByProductId({});
      return;
    }
    if (wishlistIds.length === 0) {
      setGuestWishlistProducts([]);
      setGuestVariantsByProductId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const data = await getWishlistProductsData(wishlistIds);
      if (!cancelled) {
        setGuestWishlistProducts(data.products);
        setGuestVariantsByProductId(data.variantsByProductId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isSignedIn, wishlistIds]);

  const displayWishlistProducts = isSignedIn ? wishlistProducts : guestWishlistProducts;
  const displayVariantsByProductId = isSignedIn ? variantsByProductId : guestVariantsByProductId;
  const favouritesCount = isSignedIn ? wishlistProductIds.length : wishlistIds.length;

  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - totalPrice);
  const qualifiesForFreeDelivery = totalPrice >= FREE_DELIVERY_THRESHOLD;

  const handleProcessOrder = () => {
    const cart = items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity,
      priceAtPurchase: i.priceAtPurchase,
    }));
    router.push(`/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}`);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-12">
      <h1 className="sr-only">Your Cart</h1>
      {/* Tabs */}
      <div className="flex gap-8 mb-12 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("basket")}
          className={`text-sm font-medium uppercase tracking-widest pb-4 -mb-px transition-colors ${activeTab === "basket"
            ? "text-foreground border-b-2 border-foreground"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Basket ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={`text-sm font-medium uppercase tracking-widest pb-4 -mb-px transition-colors ${activeTab === "favorites"
            ? "text-foreground border-b-2 border-foreground"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Favourites ({hasHydrated ? favouritesCount : isSignedIn ? wishlistProductIds.length : 0})
        </button>
      </div>

      {activeTab === "basket" && (
        <>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-border">
              <p className="text-muted-foreground mb-4">Your basket is empty</p>
              <Link
                href="/shop"
                className="text-sm font-normal text-foreground border-b border-foreground pb-1 hover:opacity-60"
              >
                Continue shopping
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
                      href={`/shop/${item.productId}`}
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
                      href={`/shop/${item.productId}`}
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
                        aria-label="Decrease quantity"
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
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.sku)}
                        className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Order summary */}
              <div>
                <div className="sticky top-24 border border-border p-6 bg-card/50">
                  <h2 className="text-sm font-medium uppercase tracking-widest text-foreground mb-4">
                    Order Summary
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
                        Add ${amountToFreeDelivery.toFixed(2)} more to get free
                        standard delivery
                      </p>
                    </div>
                  )}

                  {qualifiesForFreeDelivery && (
                    <p className="text-xs text-green-700 dark:text-green-400 mb-4">
                      You qualify for free standard delivery
                    </p>
                  )}

                  <div className="flex items-center justify-between py-4 border-t border-b border-border">
                    <span className="text-sm text-muted-foreground">
                      Total (VAT included)
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessOrder}
                    className="w-full mt-6 py-4 text-xs font-medium uppercase tracking-widest text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
                  >
                    Process Order
                  </button>

                  <label className="flex items-center gap-2 mt-6 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                    />
                    <span className="text-xs text-muted-foreground">
                      Promotional code
                    </span>
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
            <div className="flex flex-col items-center justify-center py-16 border border-border">
              <p className="text-muted-foreground">Loading favourites…</p>
            </div>
          ) : displayWishlistProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-border">
              <p className="text-muted-foreground mb-4">No favourites yet</p>
              <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                Save items with the heart icon while you browse. Sign in anytime to sync across devices.
              </p>
              <Link
                href="/streetwear/shop"
                className="text-sm font-normal text-foreground border-b border-foreground pb-1 hover:opacity-60"
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {displayWishlistProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variants={displayVariantsByProductId[product.id] ?? []}
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
