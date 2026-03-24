import { insertAuditLogRow } from "@/lib/audit";
import { getInternalApiSecret, MOSAIK_INTERNAL_SECRET_HEADER } from "@/lib/internal-api-secret";
import { z } from "zod";

const bodySchema = z.object({
  action: z.string().min(1).max(128),
  userId: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  ipAddress: z.string().max(256).optional(),
});

/**
 * Node-only ingestion: middleware / lib call this with `INTERNAL_API_SECRET` (or legacy `INTERNAL_AUDIT_SECRET`)
 * in header `x-mosaik-internal-secret`.
 */
export async function POST(req: Request) {
  const secret = getInternalApiSecret();
  const headerSecret = req.headers.get(MOSAIK_INTERNAL_SECRET_HEADER);
  if (!secret || headerSecret !== secret) {
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
