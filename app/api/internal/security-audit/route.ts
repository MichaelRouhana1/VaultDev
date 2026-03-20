import { insertAuditLogRow } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({
  action: z.string().min(1).max(128),
  userId: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  ipAddress: z.string().max(256).optional(),
});

/**
 * Edge-safe ingestion: middleware calls this with a shared secret (Node runtime = DB access).
 */
export async function POST(req: Request) {
  const secret = process.env.INTERNAL_AUDIT_SECRET;
  if (!secret || req.headers.get("x-internal-audit-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response("Bad Request", { status: 400 });
  }

  const { action, userId, details, ipAddress } = parsed.data;
  await insertAuditLogRow({
    action,
    userId: userId ?? null,
    details: details ?? null,
    ipAddress: ipAddress ?? "",
  });

  return Response.json({ ok: true });
}
