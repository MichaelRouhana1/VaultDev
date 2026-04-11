/**
 * Shown on /privacy and /terms when `NEXT_PUBLIC_PRIVACY_EMAIL` is unset.
 * Override in `.env.local` / Vercel for production if you use a different inbox.
 */
export const DEFAULT_LEGAL_CONTACT_EMAIL = "vault-lebanon@hotmail.com";

export function getLegalContactEmail(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();
  return fromEnv || DEFAULT_LEGAL_CONTACT_EMAIL;
}
