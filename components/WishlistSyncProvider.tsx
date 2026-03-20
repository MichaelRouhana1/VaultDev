"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { syncWishlist } from "@/actions/syncWishlist";
import { useWishlist } from "@/context/WishlistContext";
import { clearGuestWishlistStorage, WISHLIST_STORAGE_KEY } from "@/lib/wishlist-storage";

/**
 * After sign-in, merges localStorage guest wishlist into DB, clears storage, refreshes context.
 */
export function WishlistSyncProvider() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { reloadFromServer } = useWishlist();
  const syncedForUserRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      syncedForUserRef.current = null;
      return;
    }

    if (syncedForUserRef.current === userId) return;
    if (syncInFlightRef.current) return;

    const raw = typeof window !== "undefined" ? localStorage.getItem(WISHLIST_STORAGE_KEY) : null;

    if (!raw) {
      syncedForUserRef.current = userId;
      void reloadFromServer();
      return;
    }

    let ids: number[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        ids = parsed.filter(
          (x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0
        );
      }
    } catch {
      clearGuestWishlistStorage();
      syncedForUserRef.current = userId;
      void reloadFromServer();
      return;
    }

    if (ids.length === 0) {
      clearGuestWishlistStorage();
      syncedForUserRef.current = userId;
      void reloadFromServer();
      return;
    }

    syncInFlightRef.current = true;
    void (async () => {
      try {
        await syncWishlist(ids);
        clearGuestWishlistStorage();
        syncedForUserRef.current = userId;
        await reloadFromServer();
      } finally {
        syncInFlightRef.current = false;
      }
    })();
  }, [isLoaded, isSignedIn, userId, reloadFromServer]);

  return null;
}
