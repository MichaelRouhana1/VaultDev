"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { togglePromoStatus, deletePromoCode, updatePromoExpiry } from "@/actions/promo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PromoCode } from "@/db/schema";

function toDatetimeLocalValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatExpiry(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = error.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function PromoExpiryCell({ promo }: { promo: PromoCode }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(promo.expiresAt ? toDatetimeLocalValue(promo.expiresAt) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const openEditor = () => {
    setValue(promo.expiresAt ? toDatetimeLocalValue(promo.expiresAt) : "");
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await updatePromoExpiry(promo.id, value.trim() ? value : null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      setError("Could not update expiry");
    } finally {
      setPending(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span>{promo.expiresAt ? formatExpiry(promo.expiresAt) : "—"}</span>
        <Button type="button" variant="ghost" size="sm" onClick={openEditor} className="shrink-0">
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-[220px]">
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        aria-label={`Expiry for ${promo.code}`}
      />
      <p className="text-xs text-muted-foreground">Clear the date and save to remove the expiry.</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

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

  return (
    <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-md border border-border">
      <table className="w-full min-w-[960px] text-sm">
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
              Total uses
            </th>
            <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
              Per customer
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
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
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
                  {p.maxUsesPerCustomer != null ? p.maxUsesPerCustomer : "∞"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {statusLabel(p)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PromoExpiryCell promo={p} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(p.id)} className="shrink-0">
                      {p.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.code)}
                      className="shrink-0 text-sm text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
