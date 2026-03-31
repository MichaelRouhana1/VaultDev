"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const t = useTranslations("CartDrawer");
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
      productName: i.productName,
      ...(i.productImage ? { productImage: i.productImage } : {}),
      ...(i.productColor ? { productColor: i.productColor } : {}),
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
        className={`fixed end-0 top-0 z-[9999] flex h-full w-[min(100vw,28rem)] min-w-[320px] flex-col bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0 rtl:translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
        style={{ boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-xl font-bold text-foreground">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("closeAria")}
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
              <p className="font-medium">{t("empty")}</p>
              <p className="mt-1 text-sm">{t("emptyHint")}</p>
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
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t("each", { price: `$${item.priceAtPurchase}` })}
                    </p>
                    {(item.productColor || item.size) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.productColor && <span>{t("colour", { name: item.productColor })}</span>}
                        {item.productColor && item.size && " | "}
                        {item.size && <span>{t("size", { size: item.size })}</span>}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.sku, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-none border border-border hover:bg-muted text-foreground font-medium"
                        aria-label={t("decreaseQty")}
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
                        aria-label={t("increaseQty")}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.sku)}
                        className="ms-2 text-sm text-destructive hover:underline"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
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

        <div className="shrink-0 border-t border-border bg-muted p-6">
          <div
            className={`flex w-full items-center justify-between gap-4 text-sm ${items.length > 0 ? "mb-4" : ""}`}
          >
            <Link
              href="/bag"
              onClick={onClose}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {t("viewFullBag")} →
            </Link>
            <Link
              href="/bag?tab=favorites"
              onClick={onClose}
              className="shrink-0 text-end text-muted-foreground hover:text-foreground"
            >
              {t("viewFavourites")} →
            </Link>
          </div>
          {items.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">{t("total")}</span>
                <span className="text-xl font-bold text-foreground">${totalPrice.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("checkout")}
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(drawer, document.body);
}
