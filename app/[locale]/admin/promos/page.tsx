import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PromosTable } from "./PromosTable";
import { requireAdmin } from "@/lib/security";

export default async function AdminPromosPage() {
  await requireAdmin();

  const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <Link
          href="/admin/promos/new"
          className="px-6 py-2.5 bg-foreground text-background text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Add Promo Code
        </Link>
      </div>
      <PromosTable promos={codes} />
    </div>
  );
}
