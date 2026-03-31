"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  orderNumber: string;
  className?: string;
  monoClassName?: string;
};

export function OrderNumberWithCopy({ orderNumber, className, monoClassName }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(orderNumber);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore — clipboard may be denied */
      }
    },
    [orderNumber],
  );

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums tracking-tight text-foreground",
          monoClassName,
        )}
      >
        {orderNumber}
      </span>
      <button
        type="button"
        onClick={(e) => void onCopy(e)}
        aria-label={copied ? "Copied" : "Copy order number"}
        title={copied ? "Copied!" : "Copy order number"}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-none border border-border bg-background text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        {copied ? (
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
        ) : (
          <Copy className="size-4" strokeWidth={2} />
        )}
      </button>
    </span>
  );
}
