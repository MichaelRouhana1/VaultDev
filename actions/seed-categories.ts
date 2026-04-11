"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/security";

export async function seedRootCategories() {
    const { userId } = await requireAdmin();

    const categoriesToSeed = [
        { slug: "streetwear", label: "Streetwear", level: "root" as const },
        { slug: "formal", label: "Classic", level: "root" as const },
    ];

    let seededCount = 0;

    for (const cat of categoriesToSeed) {
        const existing = await db.select().from(categories).where(eq(categories.slug, cat.slug)).limit(1);
        if (existing.length === 0) {
            const allCats = await db.select({ sortOrder: categories.sortOrder }).from(categories);
            const nextSortOrder = allCats.length === 0 ? 0 : Math.max(0, ...allCats.map((r) => r.sortOrder ?? 0)) + 1;

            await db.insert(categories).values({
                slug: cat.slug,
                label: cat.label,
                level: cat.level,
                sortOrder: nextSortOrder,
            });
            seededCount++;
        }
    }

    auditLog({ userId: userId!, action: "category.seed_roots", target: String(seededCount), details: { seededCount } });
    return { success: true, seededCount };
}
