/**
 * Admin dropzone `accept` list — keep extensions aligned with `ALLOWED_IMAGE_EXTENSIONS` in `lib/security.ts`.
 */
export const ADMIN_IMAGE_ACCEPT_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  ".tif",
  ".tiff",
  ".svg",
] as const;

export const adminImageDropzoneAccept = {
  "image/*": [...ADMIN_IMAGE_ACCEPT_EXTENSIONS],
} as const;
