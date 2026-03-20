"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import convert from "heic-convert";

const MAX_BYTES = 5 * 1024 * 1024;

/** Admin-only: decode HEIC/HEIF to JPEG bytes (fallback when browser heic2any fails). */
export async function convertHeicToJpegServer(
  file: File
): Promise<{ base64: string } | { error: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  if (!file?.size) return { error: "No file provided" };
  if (file.size > MAX_BYTES) return { error: "File too large (max 5MB)" };

  try {
    // heic-decode uses spread on buffer slices; plain ArrayBuffer is not iterable — use Buffer.
    const buffer = Buffer.from(await file.arrayBuffer());
    const output = await convert({
      buffer: buffer as unknown as ArrayBuffer,
      format: "JPEG",
      quality: 0.92,
    });
    return { base64: Buffer.from(output).toString("base64") };
  } catch (err) {
    console.error("convertHeicToJpegServer failed:", err);
    return { error: "Could not convert HEIC on server." };
  }
}
