"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type StorefrontCurrency,
  STOREFRONT_CURRENCY_STORAGE_KEY,
  isStorefrontCurrency,
  formatPriceFromUsd,
} from "@/lib/storefront-currency";

interface CurrencyContextValue {
  currency: StorefrontCurrency;
  setCurrency: (c: StorefrontCurrency) => void;
  /** Assumes `basePrice` is stored in USD (catalog, cart, checkout display). */
  formatPrice: (basePriceUsd: string | number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<StorefrontCurrency>("USD");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOREFRONT_CURRENCY_STORAGE_KEY);
      if (raw && isStorefrontCurrency(raw)) {
        setCurrencyState(raw);
      }
    } catch {
      // ignore
    }
  }, []);

  const setCurrency = useCallback((c: StorefrontCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STOREFRONT_CURRENCY_STORAGE_KEY, c);
    } catch {
      // ignore
    }
  }, []);

  const formatPrice = useCallback(
    (basePriceUsd: string | number) => formatPriceFromUsd(basePriceUsd, currency),
    [currency],
  );

  const value = useMemo(
    () => ({ currency, setCurrency, formatPrice }),
    [currency, setCurrency, formatPrice],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}
