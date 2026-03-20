import { convertHeicToJpegServer } from "@/actions/convertHeic";

/**
 * Browsers cannot decode HEIC/HEIF for img/canvas (react-easy-crop).
 * Try client-side heic2any first; if it fails (common with Next/Turbopack), fall back to admin-only server conversion.
 */
export function isHeicLikeFile(file: File): boolean {
  return (
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name) ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heif-sequence"
  );
}

function base64ToJpegFile(base64: string, suggestedName: string): File {
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const name = suggestedName.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([binary], name, { type: "image/jpeg" });
}

export async function ensureBrowserDisplayableImage(file: File): Promise<File> {
  if (!isHeicLikeFile(file)) return file;

  const outName = file.name.replace(/\.(heic|heif)$/i, ".jpg");

  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], outName, { type: "image/jpeg" });
  } catch (clientErr) {
    console.warn("[HEIC] heic2any failed, using server fallback:", clientErr);
    const server = await convertHeicToJpegServer(file);
    if ("error" in server) {
      throw new Error(server.error);
    }
    return base64ToJpegFile(server.base64, file.name);
  }
}
