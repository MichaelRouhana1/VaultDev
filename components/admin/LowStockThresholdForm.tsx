"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateLowStockThreshold } from "@/actions/inventory-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LowStockThresholdForm({ initialThreshold }: { initialThreshold: number }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateLowStockThreshold, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-lg border border-border bg-muted/30 p-4 md:p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Variants with stock greater than zero but below this number show as low stock in the table and can trigger
          admin notifications after orders.
        </p>
      </div>
      <div className="space-y-2 max-w-xs">
        <Label htmlFor="lowStockThreshold">Low in stock threshold (units)</Label>
        <Input
          id="lowStockThreshold"
          name="threshold"
          type="number"
          min={1}
          max={999999}
          step={1}
          required
          defaultValue={initialThreshold}
        />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      ) : null}
      <Button type="submit" disabled={isPending} variant="secondary" size="sm">
        {isPending ? "Saving…" : "Save threshold"}
      </Button>
    </form>
  );
}
