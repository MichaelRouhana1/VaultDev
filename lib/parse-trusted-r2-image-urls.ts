import { z } from "zod";
import { isTrustedR2PublicUrl } from "@/lib/r2-public-url";

export function parseTrustedR2ImageUrlArray(parsed: unknown): { ok: true; urls: string[] } | { ok: false; error: string } {
  const arr = z.array(z.string()).safeParse(parsed);
  if (!arr.success) return { ok: false, error: "Invalid image URL list" };
  const urls: string[] = [];
  for (const item of arr.data) {
    const u = z.string().url().safeParse(item.trim());
    if (!u.success) return { ok: false, error: "Invalid image URL" };
    if (!isTrustedR2PublicUrl(u.data)) return { ok: false, error: "Image URLs must use configured storage" };
    urls.push(u.data);
  }
  return { ok: true, urls };
}

export function parseTrustedR2ImageUrlArrayFromFormKey(
  formData: FormData,
  key: string
): { ok: true; urls: string[] } | { ok: false; error: string } {
  const raw = formData.get(key);
  if (raw == null || raw === "") return { ok: true, urls: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return { ok: false, error: "Invalid image URL JSON" };
  }
  return parseTrustedR2ImageUrlArray(parsed);
}

/** Optional single URL from FormData (empty = null). */
export function parseOptionalTrustedR2ImageUrlFromForm(
  formData: FormData,
  key: string
): { ok: true; url: string | null } | { ok: false; error: string } {
  const raw = formData.get(key)?.toString().trim();
  if (!raw) return { ok: true, url: null };
  const u = z.string().url().safeParse(raw);
  if (!u.success) return { ok: false, error: "Invalid image URL" };
  if (!isTrustedR2PublicUrl(u.data)) return { ok: false, error: "Image URL must use configured storage" };
  return { ok: true, url: u.data };
}
