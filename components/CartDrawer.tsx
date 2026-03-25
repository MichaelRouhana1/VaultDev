"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProceedToCheckout = () => {
    onClose();
    const cart = items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity,
      priceAtPurchase: i.priceAtPurchase,
    }));
    router.push(
      `/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}`
    );
  };

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className={`fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        aria-hidden={!isOpen}
      />

      {/* Drawer - fixed width, rendered via portal to avoid parent layout issues */}
      <aside
        className={`fixed top-0 right-0 h-full w-[min(100vw,28rem)] min-w-[320px] flex flex-col bg-card text-card-foreground shadow-2xl z-[9999] transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Your Cart</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-none text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close cart"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <svg
                className="w-16 h-16 mb-4 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm mt-1">Add items to get started</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.sku}
                  className="flex gap-4 pb-4 border-b border-border last:border-0"
                >
                  <div className="relative w-20 h-20 shrink-0 overflow-hidden bg-muted">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productColor ? `${item.productName} in ${item.productColor}` : item.productName}
                        fill
                        className="object-cover"

                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ${item.priceAtPurchase} each
                    </p>
                    {(item.productColor || item.size) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.productColor && (
                          <span>Colour: {item.productColor}</span>
                        )}
                        {item.productColor && item.size && " | "}
                        {item.size && <span>Size: {item.size}</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.sku, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-none border border-border hover:bg-muted text-foreground font-medium"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.sku, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-none border border-border hover:bg-muted text-foreground font-medium"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.sku)}
                        className="ml-2 text-sm text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-foreground">
                      $
                      {(
                        parseFloat(item.priceAtPurchase) * item.quantity
                      ).toFixed(2)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-muted">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-sm">
              <Link
                href="/cart"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                View full cart →
              </Link>
              <Link
                href="/cart?tab=favorites"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                View favourites →
              </Link>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-foreground">
                Total
              </span>
              <span className="text-xl font-bold text-foreground">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full py-3 px-4 font-medium text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(drawer, document.body);
}
