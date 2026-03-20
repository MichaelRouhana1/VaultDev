"use server";

import { auth } from "@clerk/nextjs/server";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditLogRow } from "@/db/schema";

const PAGE_SIZE = 50;

export type GetAuditLogsResult =
  | { ok: true; logs: AuditLogRow[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string };

export async function getAuditLogs(options?: {
  action?: string | null;
  page?: number;
}): Promise<GetAuditLogsResult> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    return { ok: false, error: "Forbidden" };
  }

  const page = Math.max(1, options?.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;
  const actionFilter = options?.action?.trim() || null;

  const [rows, countRows] = actionFilter
    ? await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.action, actionFilter))
          .orderBy(desc(auditLogs.createdAt))
          .limit(PAGE_SIZE)
          .offset(offset),
        db
          .select({ value: count() })
          .from(auditLogs)
          .where(eq(auditLogs.action, actionFilter)),
      ])
    : await Promise.all([
        db
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(PAGE_SIZE)
          .offset(offset),
        db.select({ value: count() }).from(auditLogs),
      ]);

  const total = countRows[0]?.value ?? 0;

  return {
    ok: true,
    logs: rows,
    total,
    page,
    pageSize: PAGE_SIZE,
  };
}
