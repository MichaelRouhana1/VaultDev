"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { AuditLogTableRow } from "@/actions/getAuditLogs";
import {
  getAuditActionBadgeClass,
  getAuditActionLabel,
  AUDIT_LOG_FILTER_OPTIONS,
  AUDIT_LOG_ALL,
} from "@/lib/audit-log-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return String(d);
  }
}

function prettifyDetails(details: unknown): string {
  if (details == null) return "{}";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

interface AuditLogTableProps {
  logs: AuditLogTableRow[];
  total: number;
  page: number;
  pageSize: number;
  actionFilter: string | null;
}

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  actionFilter,
}: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<unknown>(null);
  const [selectedTitle, setSelectedTitle] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setQuery = useCallback(
    (next: { page?: number; action?: string | null }) => {
      const p = new URLSearchParams(searchParams?.toString() ?? "");
      if (next.page != null) {
        if (next.page <= 1) p.delete("page");
        else p.set("page", String(next.page));
      }
      if (next.action !== undefined) {
        if (!next.action) p.delete("action");
        else p.set("action", next.action);
        if (next.page === undefined) p.delete("page");
      }
      const q = p.toString();
      router.push(q ? `/admin/logs?${q}` : "/admin/logs");
    },
    [router, searchParams],
  );

  const filterValue = actionFilter && actionFilter.length > 0 ? actionFilter : AUDIT_LOG_ALL;

  const rows = useMemo(() => logs, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total} event{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Filter</span>
          <Select
            value={filterValue}
            onValueChange={(v) => setQuery({ action: v === AUDIT_LOG_ALL ? null : v })}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_LOG_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">When</TableHead>
              <TableHead className="w-[200px]">Event</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">IP</TableHead>
              <TableHead className="w-[120px] text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No audit events match this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const detailsObj =
                  row.details && typeof row.details === "object" && !Array.isArray(row.details)
                    ? (row.details as Record<string, unknown>)
                    : null;
                const label = getAuditActionLabel(row.action, detailsObj);
                const badgeClass = getAuditActionBadgeClass(row.action);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                      >
                        {label}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-sm max-w-[240px] truncate"
                      title={row.userId ? `Clerk ID: ${row.userId}` : undefined}
                    >
                      <span className="font-medium text-foreground">{row.userDisplayLabel}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {row.ipAddress || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDetails(row.details);
                          setSelectedTitle(label);
                          setDetailsOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setQuery({ page: page - 1 })}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setQuery({ page: page + 1 })}
        >
          Next
        </Button>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event details</DialogTitle>
            <DialogDescription>{selectedTitle}</DialogDescription>
          </DialogHeader>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded-md bg-muted p-4 border border-border">
            {prettifyDetails(selectedDetails)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
