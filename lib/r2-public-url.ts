import { getR2PublicBaseUrlNormalized } from "@/lib/r2-client";

/** True when `url` is under the configured `NEXT_PUBLIC_R2_PUBLIC_URL` origin/path. */
export function isTrustedR2PublicUrl(url: string): boolean {
  const base = getR2PublicBaseUrlNormalized();
  if (!base) return false;
  const normalized = url.trim();
  if (normalized === base) return true;
  return normalized.startsWith(`${base}/`);
}
