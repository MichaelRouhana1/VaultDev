"use client";

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";

type ShopListingNavContextValue = {
  startShopNavigation: (href: string) => void;
  isShopNavPending: boolean;
};

const ShopListingNavContext = createContext<ShopListingNavContextValue | null>(null);

export function ShopListingNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isShopNavPending, startTransition] = useTransition();

  const startShopNavigation = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href, { scroll: true });
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({ startShopNavigation, isShopNavPending }),
    [startShopNavigation, isShopNavPending],
  );

  return <ShopListingNavContext.Provider value={value}>{children}</ShopListingNavContext.Provider>;
}

export function useShopListingNav(): ShopListingNavContextValue | null {
  return useContext(ShopListingNavContext);
}
