/** localStorage key for guest wishlist (product IDs). */
export const WISHLIST_STORAGE_KEY = "vault_wishlist_ids";

export function readGuestWishlistIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0);
  } catch {
    return [];
  }
}

export function writeGuestWishlistIds(ids: number[]): void {
  if (typeof window === "undefined") return;
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  if (unique.length === 0) {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    return;
  }
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(unique));
}

export function clearGuestWishlistStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WISHLIST_STORAGE_KEY);
}
