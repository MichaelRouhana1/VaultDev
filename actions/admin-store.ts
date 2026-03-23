"use server";

import { z } from "zod";

import { cookies } from "next/headers";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { checkAdminSession, requireAdminAction } from "@/lib/security";

export async function setAdminStoreType(
    storeType: "streetwear" | "formal",
): Promise<{ success: true } | { success: false; error: string }> {
    const gate = await requireAdminAction({ auditTarget: "admin.store.set" });
    if (!gate.authorized) return gate.response;
    const validatedType = z.enum(["streetwear", "formal"]).parse(storeType);
    const cookieStore = await cookies();
    cookieStore.set("adminStore", validatedType, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return { success: true };
}

export async function getAdminStoreType(): Promise<"streetwear" | "formal"> {
    const s = await checkAdminSession();
    if (!s.ok) {
        return "streetwear"; // default if not admin (defense in depth; layout uses requireAdmin)
    }
    const cookieStore = await cookies();
    const val = cookieStore.get("adminStore")?.value;
    if (val === "formal") return "formal";
    return "streetwear"; // default
}

export async function migrateMissingStoreTypes(): Promise<{ success?: boolean; error?: string }> {
    const gate = await requireAdminAction({ auditTarget: "admin.store.migrate" });
    if (!gate.authorized) return gate.response;
    // If some old products have NULL storeType (e.g., from before schema upgrade), set them to 'streetwear'
    try {
        await db.update(products).set({ storeType: "streetwear" }).where(isNull(products.storeType));
        return { success: true };
    } catch (err) {
        logger.error("Migration error:", err);
        return { error: String(err) };
    }
}
