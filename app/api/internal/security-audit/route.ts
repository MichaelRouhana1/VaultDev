import { insertAuditLogRow } from "@/lib/audit";
import { internalApiSecretHeaderMatches } from "@/lib/internal-api-secret-match";
import { MOSAIK_INTERNAL_SECRET_HEADER } from "@/lib/internal-api-secret";
import { checkInternalSecurityAuditWebhookLimit } from "@/lib/rate-limit";
import { z } from "zod";

function clientIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

const bodySchema = z.object({
  action: z.string().min(1).max(128),
  userId: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  ipAddress: z.string().max(256).optional(),
});

/**
 * Node-only ingestion: middleware / lib call this with `INTERNAL_API_SECRET` (or legacy `INTERNAL_AUDIT_SECRET`)
 * in header `x-mosaik-internal-secret`.
 *
 * Per-IP rate limit runs **before** secret verification so brute-force guessing cannot burn CPU/DB on auth.
 */
export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const { allowed, retryAfterMs } = await checkInternalSecurityAuditWebhookLimit(ip);
  if (!allowed) {
    const headers =
      retryAfterMs > 0
        ? { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) }
        : undefined;
    return new Response("Too Many Requests", { status: 429, headers });
  }

  if (!internalApiSecretHeaderMatches(req.headers.get(MOSAIK_INTERNAL_SECRET_HEADER))) {
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
