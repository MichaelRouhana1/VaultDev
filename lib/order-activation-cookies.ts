/**
 * HttpOnly cookies for guest order activation (checkout success + /activate-account).
 * Tokens never appear in the address bar after the email handoff step (see /api/auth/verify).
 */

export const ACTIVATION_TOKEN_COOKIE = "mosaik_activation_token";
/** Numeric order id for pairing with the token (required by `getValidActivationOrder`). */
export const ACTIVATION_ORDER_ID_COOKIE = "mosaik_activation_order_id";

export const ACTIVATION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24; // 24h, matches DB expiry

export type ActivationCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

export function getActivationCookieOptions(): ActivationCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVATION_COOKIE_MAX_AGE_SEC,
  };
}

export function clearActivationCookies(store: { delete: (name: string) => void }): void {
  store.delete(ACTIVATION_TOKEN_COOKIE);
  store.delete(ACTIVATION_ORDER_ID_COOKIE);
}
