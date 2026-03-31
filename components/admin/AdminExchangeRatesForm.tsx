"use client";

import { useActionState } from "react";
import { updateStorefrontExchangeRates } from "@/actions/storefront-exchange-rates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminExchangeRatesForm({
  initialEurPerUsd,
  initialLbpPerUsd,
}: {
  initialEurPerUsd: number;
  initialLbpPerUsd: number;
}) {
  const [state, formAction, isPending] = useActionState(updateStorefrontExchangeRates, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Catalog and checkout amounts are stored in USD. These rates control how EUR and LBP prices are shown on the
        storefront (1 USD = this many EUR / LBP).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eurPerUsd">EUR per $1 USD</Label>
          <Input
            id="eurPerUsd"
            name="eurPerUsd"
            type="number"
            step="any"
            min="0.00000001"
            max="1000"
            required
            defaultValue={initialEurPerUsd}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lbpPerUsd">LBP per $1 USD</Label>
          <Input
            id="lbpPerUsd"
            name="lbpPerUsd"
            type="number"
            step="any"
            min="0.01"
            max="1000000000000"
            required
            defaultValue={initialLbpPerUsd}
          />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">Saved. Refresh the storefront to see updated prices.</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save exchange rates"}
      </Button>
    </form>
  );
}
