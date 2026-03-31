"use client";

import { useRouter } from "@/i18n/navigation";
import { togglePromoStatus, deletePromoCode } from "@/actions/promo";
import { Button } from "@/components/ui/button";
import type { PromoCode } from "@/db/schema";

interface PromosTableProps {
  promos: PromoCode[];
}

export function PromosTable({ promos }: PromosTableProps) {
  const router = useRouter();

  const handleToggle = async (id: number) => {
    await togglePromoStatus(id);
    router.refresh();
  };

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return;
    await deletePromoCode(id);
    router.refresh();
  };

  const formatValue = (p: PromoCode) => {
    switch (p.discountType) {
      case "PERCENTAGE":
        return `${p.discountValue}%`;
      case "FIXED_AMOUNT":
        return `$${p.discountValue}`;
      case "FREE_SHIPPING":
        return "Free shipping";
      default:
        return p.discountValue;
    }
  };

  const usesLabel = (p: PromoCode) =>
    p.maxUses != null ? `${p.currentUses}/${p.maxUses}` : `${p.currentUses} (∞)`;

  const statusLabel = (p: PromoCode) => (p.isActive ? "Active" : "Inactive");

  const expiryLabel = (p: PromoCode) =>
    p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—";

  return (
    <div className="border border-border rounded-md overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Code
            </th>
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Type
            </th>
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Value
            </th>
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Uses
            </th>
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Expiry
            </th>
            <th className="text-right px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {promos.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                No promo codes yet. Add one to get started.
              </td>
            </tr>
          ) : (
            promos.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-medium">{p.code}</td>
                <td className="px-4 py-3">{p.discountType.replace("_", " ")}</td>
                <td className="px-4 py-3">{formatValue(p)}</td>
                <td className="px-4 py-3">{usesLabel(p)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {statusLabel(p)}
                  </span>
                </td>
                <td className="px-4 py-3">{expiryLabel(p)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(p.id)}
                    className="mr-2"
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.code)}
                    className="text-destructive hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
