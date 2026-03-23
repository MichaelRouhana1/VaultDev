"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { runRetentionCleanup } from "@/actions/admin-cleanup";
import { Button } from "@/components/ui/button";

export function RetentionCleanupButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      "Prune old data? This deletes audit log rows older than 30 days and read notifications older than 14 days. This cannot be undone.",
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await runRetentionCleanup();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Maintenance complete: removed ${result.auditLogsDeleted} audit log row(s) and ${result.notificationsDeleted} notification(s).`,
      );
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      <p className="text-sm font-medium">Data retention</p>
      <p className="text-xs text-muted-foreground">
        Removes audit logs older than 30 days and read notifications older than 14 days. Run manually when
        needed (no background cron).
      </p>
      <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? "Running…" : "Prune old logs & notifications"}
      </Button>
    </div>
  );
}
