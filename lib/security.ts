/**
 * Security utilities for OWASP hardening: XSS prevention, file upload validation, filename sanitization,
 * and centralized Clerk admin authorization (P3).
 */

import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auditLog } from "@/lib/audit";
import { isDashboardRole } from "@/lib/clerk-dashboard-role";

/** Allowed image extensions and MIME types for product/hero/lookbook uploads */
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"] as const;
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/** Canonical `Content-Type` for R2/S3 after upload (from validated extension; avoids empty / wrong client MIME). */
const IMAGE_EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function canonicalImageMimeFromExt(ext: string): string {
  return IMAGE_EXT_TO_MIME[ext.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Whether the browser-reported MIME is acceptable for this image extension.
 * JPEG is often reported as `image/jpg` (non-standard) or `image/pjpeg`; many clients send `""` or `application/octet-stream`.
 */
function imageMimeMatchesExtension(ext: string, rawType: string): boolean {
  const type = rawType.trim().toLowerCase();
  const generic = type === "" || type === "application/octet-stream";

  if (ext === "jpg" || ext === "jpeg") {
    if (generic) return true;
    return type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg";
  }
  if (ext === "png") {
    if (generic) return true;
    return type === "image/png";
  }
  if (ext === "gif") {
    if (generic) return true;
    return type === "image/gif";
  }
  if (ext === "webp") {
    if (generic) return true;
    return type === "image/webp";
  }
  return false;
}

/** Allowed video extensions and MIME types for home video upload */
export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "webm"] as const;
export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;

/** Max file sizes in bytes */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Cap for payloads accepted by Server Actions (`next.config.ts` `experimental.serverActions.bodySizeLimit`).
 * Image uploads through actions must not exceed this or Next will reject the request before the action runs.
 */
export const MAX_SERVER_ACTION_BODY_BYTES = 10 * 1024 * 1024; // 10mb — keep in sync with next.config.ts `experimental.serverActions.bodySizeLimit`

/**
 * Escapes HTML special characters to prevent XSS when interpolating user input into HTML.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes a filename by removing path traversal and control characters.
 * Returns a safe basename-only string.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== "string") return "file";
  // Remove path segments and normalize
  const basename = name.replace(/^.*[/\\]/, "").trim();
  // Strip path traversal and dangerous chars
  const safe = basename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\.{2,}/g, "");
  return safe || "file";
}

/**
 * Validates href for safe use (no javascript: or other schemes). Allows relative paths and https only.
 */
export function validateHref(href: string): { ok: true; href: string } | { ok: false; error: string } {
  const trimmed = (href || "").trim();
  if (!trimmed) return { ok: true, href: "/" };
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return { ok: false, error: "Invalid link URL" };
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return { ok: true, href: trimmed };
  }
  if (lower.startsWith("https://")) {
    return { ok: true, href: trimmed };
  }
  return { ok: false, error: "Link must be a relative path (/) or https:// URL" };
}

export type UploadFileKind = "image" | "video";

export type ValidateUploadFileResult =
  | { ok: true; ext: string }
  | { ok: false; error: string };

/**
 * Validates file type (extension + MIME), size, and returns a safe extension.
 * Use before uploading to storage. MIME is client-provided so we validate extension first and require MIME to match allowed set.
 */
export function validateUploadFile(
  file: { name: string; type: string; size: number },
  kind: UploadFileKind
): ValidateUploadFileResult {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const allowedExts: readonly string[] = kind === "image" ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_VIDEO_EXTENSIONS;
  const allowedMimes: readonly string[] = kind === "image" ? ALLOWED_IMAGE_MIME_TYPES : ALLOWED_VIDEO_MIME_TYPES;
  const maxSize = kind === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;

  if (!ext || !allowedExts.includes(ext)) {
    return {
      ok: false,
      error: `Invalid file type. Allowed: ${allowedExts.join(", ")}`,
    };
  }

  if (kind === "image") {
    if (!imageMimeMatchesExtension(ext, file.type)) {
      return {
        ok: false,
        error: `Invalid MIME type for .${ext}. Use JPEG, PNG, GIF, or WebP.`,
      };
    }
  } else if (!allowedMimes.includes(file.type)) {
    return {
      ok: false,
      error: `Invalid MIME type. Allowed: ${allowedMimes.join(", ")}`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > maxSize) {
    const maxMB = kind === "image" ? 5 : 50;
    return { ok: false, error: `File too large. Maximum ${maxMB}MB` };
  }

  return { ok: true, ext };
}

// --- Clerk admin gate (session token `publicMetadata` / JWT template → `sessionClaims.metadata`) ---

export type AdminSessionCheck =
  | { ok: true; userId: string }
  | { ok: false; userId: string | null };

/**
 * True when the user is signed in and `sessionClaims.metadata.role` is `admin` or `superadmin`.
 * Matches middleware and existing server-action checks.
 */
export async function checkAdminSession(): Promise<AdminSessionCheck> {
  const { userId, sessionClaims } = await auth();
  if (!userId || !isDashboardRole(sessionClaims?.metadata?.role)) {
    return { ok: false, userId: userId ?? null };
  }
  return { ok: true, userId };
}

/**
 * For RSC / server actions that should redirect non-admins (defense in depth with middleware).
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const s = await checkAdminSession();
  if (!s.ok) {
    return redirect({ href: "/", locale: await getLocale() });
  }
  return { userId: s.userId };
}

export const UNAUTHORIZED_ADMIN_ACTION_RESPONSE = {
  success: false as const,
  error: "Unauthorized: Admin access required.",
};

export type UnauthorizedAdminActionResponse = typeof UNAUTHORIZED_ADMIN_ACTION_RESPONSE;

/**
 * For server actions that must return JSON instead of redirecting.
 * Optionally logs `auth.failed_admin` with `auditTarget` (e.g. `product.create`).
 */
export async function requireAdminAction(options?: {
  auditTarget?: string;
}): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: UnauthorizedAdminActionResponse }
> {
  const s = await checkAdminSession();
  if (!s.ok) {
    if (options?.auditTarget) {
      auditLog({ userId: s.userId, action: "auth.failed_admin", target: options.auditTarget });
    }
    return { authorized: false, response: { ...UNAUTHORIZED_ADMIN_ACTION_RESPONSE } };
  }
  return { authorized: true, userId: s.userId };
}
