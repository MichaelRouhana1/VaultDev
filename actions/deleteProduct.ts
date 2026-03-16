"use server";

import { z } from "zod";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productColors } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { deleteFromR2 } from "@/lib/uploadImages";

export async function deleteProduct(productId: number): Promise<void> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "product.delete" });
    redirect("/");
  }

  const id = z.number().int().positive().parse(productId);

  const colors = await db.select({ imageUrls: productColors.imageUrls }).from(productColors).where(eq(productColors.productId, id));
  for (const color of colors) {
    for (const url of color.imageUrls ?? []) {
      await deleteFromR2(url);
    }
  }

  await db.delete(products).where(eq(products.id, id));
  auditLog({ userId, action: "product.delete", target: String(id) });
}
