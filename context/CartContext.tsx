"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

function getCartKey(userId: string | null | undefined): string {
  return `vault_cart_${userId ?? "guest"}`;
}

export function getCartItemSku(productId: number, size: string): string {
  return `${productId}-${size}`;
}

export interface CartItemDisplay {
  productId: number;
  size: string;
  quantity: number;
  priceAtPurchase: string;
  productName: string;
  productImage?: string;
  productColor?: string;
  sku: string;
}

export interface CartItemForCheckout {
  productId: number;
  size: string;
  quantity: number;
  priceAtPurchase: string;
}

export interface CartItemToClear {
  productId: number;
  size: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItemDisplay[];
  addToCart: (item: Omit<CartItemDisplay, "sku"> & { sku?: string }) => void;
  removeFromCart: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearOrderedItems: (items: CartItemToClear[]) => void;
  totalItems: number;
  totalPrice: number;
  openCart: () => void;
  setOpenCart: (fn: () => void) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(key: string): CartItemDisplay[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItemDisplay[];
    return parsed.filter((i) => i.productId && i.quantity > 0);
  } catch {
    return [];
  }
}

function saveCart(key: string, items: CartItemDisplay[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [items, setItems] = useState<CartItemDisplay[]>([]);
  const [openCartFn, setOpenCartFn] = useState<() => void>(() => () => {});

  const cartKey = getCartKey(userId);

  useEffect(() => {
    setItems(loadCart(cartKey));
  }, [cartKey]);

  const addToCart = useCallback(
    (item: Omit<CartItemDisplay, "sku"> & { sku?: string }) => {
      const sku = item.sku ?? getCartItemSku(item.productId, item.size);
      setItems((prev) => {
        const existing = prev.find((i) => i.sku === sku);
        const next = existing
          ? prev.map((i) =>
              i.sku === sku
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          : [...prev, { ...item, sku }];
        saveCart(cartKey, next);
        return next;
      });
    },
    [cartKey]
  );

  const removeFromCart = useCallback(
    (sku: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.sku !== sku);
        saveCart(cartKey, next);
        return next;
      });
    },
    [cartKey]
  );

  const updateQuantity = useCallback(
    (sku: string, quantity: number) => {
      setItems((prev) => {
        const next =
          quantity < 1
            ? prev.filter((i) => i.sku !== sku)
            : prev.map((i) => (i.sku === sku ? { ...i, quantity } : i));
        saveCart(cartKey, next);
        return next;
      });
    },
    [cartKey]
  );

  const clearOrderedItems = useCallback(
    (orderedItems: CartItemToClear[]) => {
      setItems((prev) => {
        let next = [...prev];
        for (const ordered of orderedItems) {
          const sku = getCartItemSku(ordered.productId, ordered.size);
          const idx = next.findIndex((i) => i.sku === sku);
          if (idx === -1) continue;
          const item = next[idx];
          const newQty = item.quantity - ordered.quantity;
            if (newQty <= 0) {
              next = next.filter((i) => i.sku !== sku);
            } else {
              next = next.map((i) =>
                i.sku === sku ? { ...i, quantity: newQty } : i
              );
            }
        }
        saveCart(cartKey, next);
        return next;
      });
    },
    [cartKey]
  );

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce(
    (sum, i) => sum + parseFloat(i.priceAtPurchase) * i.quantity,
    0
  );

  const setOpenCart = useCallback((fn: () => void) => {
    setOpenCartFn(() => fn);
  }, []);

  const openCart = useCallback(() => {
    openCartFn();
  }, [openCartFn]);

  const value: CartContextValue = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearOrderedItems,
    totalItems,
    totalPrice,
    openCart,
    setOpenCart,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
