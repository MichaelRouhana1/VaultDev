"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { uploadProductImage as uploadToR2 } from "@/lib/uploadImages";

export async function uploadProductImage(
  file: File
): Promise<{ url: string } | { error: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  if (!file?.size) {
    return { error: "No file provided" };
  }

  const result = await uploadToR2(file, `product-${Date.now()}`);
  if (result.error) return { error: result.error };
  if (!result.url) return { error: "Upload failed" };
  return { url: result.url };
}
