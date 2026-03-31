"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createPromoCode } from "@/actions/promo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PromoCodeForm() {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form) return;
    setIsPending(true);
    setState(null);
    const formData = new FormData(form);
    const result = await createPromoCode(formData);
    setState(result);
    setIsPending(false);
    if (result.id) {
      router.push("/admin/promos");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Promo code details</CardTitle>
          <CardDescription>Create a new promotional code for your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              required
              placeholder="e.g. SUMMER20"
              className="uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />
            <p className="text-xs text-muted-foreground">Will be stored in uppercase</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discountType">Discount type</Label>
              <select
                id="discountType"
                name="discountType"
                required
                defaultValue="PERCENTAGE"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
                <option value="FREE_SHIPPING">Free shipping</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">Value</Label>
              <Input
                id="discountValue"
                name="discountValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="20"
                defaultValue="20"
              />
              <p className="text-xs text-muted-foreground">
                % for percentage, $ for fixed. Ignored for free shipping.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minOrderAmount">Minimum order amount ($)</Label>
            <Input
              id="minOrderAmount"
              name="minOrderAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              defaultValue="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUses">Max uses (optional)</Label>
            <Input
              id="maxUses"
              name="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration date (optional)</Label>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create promo code"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/promos")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
