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
import { useAuth } from "@clerk/nextjs";
import { toggleWishlist } from "@/actions/toggleWishlist";
import { getWishlistProductIds } from "@/actions/getWishlistProductIds";
import { readGuestWishlistIds, writeGuestWishlistIds } from "@/lib/wishlist-storage";

interface WishlistContextValue {
  /** Stable sorted list of wishlisted product IDs */
  wishlistIds: number[];
  hasHydrated: boolean;
  isInWishlist: (productId: number) => boolean;
  toggleItem: (productId: number) => Promise<void>;
  reloadFromServer: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  const reloadFromServer = useCallback(async () => {
    if (!isSignedIn) {
      setWishlistIds(readGuestWishlistIds());
      return;
    }
    const ids = await getWishlistProductIds();
    setWishlistIds(ids);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    void (async () => {
      if (isSignedIn) {
        const ids = await getWishlistProductIds();
        if (!cancelled) {
          setWishlistIds(ids);
          setHasHydrated(true);
        }
      } else {
        if (!cancelled) {
          setWishlistIds(readGuestWishlistIds());
          setHasHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId]);

  const isInWishlist = useCallback(
    (productId: number) => wishlistIds.includes(productId),
    [wishlistIds]
  );

  const toggleItem = useCallback(
    async (productId: number) => {
      if (!Number.isInteger(productId) || productId <= 0) return;

      if (isSignedIn) {
        const result = await toggleWishlist(productId);
        if (result.error) return;
        setWishlistIds((prev) => {
          const inList = result.inWishlist === true;
          if (inList) {
            return prev.includes(productId) ? prev : [...prev, productId];
          }
          return prev.filter((id) => id !== productId);
        });
        return;
      }

      setWishlistIds((prev) => {
        const next = prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];
        writeGuestWishlistIds(next);
        return next;
      });
    },
    [isSignedIn]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistIds,
      hasHydrated,
      isInWishlist,
      toggleItem,
      reloadFromServer,
    }),
    [wishlistIds, hasHydrated, isInWishlist, toggleItem, reloadFromServer]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
