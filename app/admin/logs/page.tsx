import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/actions/getAuditLogs";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { RetentionCleanupButton } from "@/components/admin/RetentionCleanupButton";

export const metadata = {
  title: "Security logs | VAULT Admin",
};

export default async function AdminSecurityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const action = sp.action?.trim() || null;

  const result = await getAuditLogs({ page, action });
  if (!result.ok) {
    redirect("/");
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit trail for sign-in issues, bulk pricing, inventory overrides, and admin access denials.
        </p>
      </div>
      <RetentionCleanupButton />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading table…</p>}>
        <AuditLogTable
          logs={result.logs}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          actionFilter={action}
        />
      </Suspense>
    </div>
  );
}
