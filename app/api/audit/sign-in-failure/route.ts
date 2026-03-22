import { headers } from "next/headers";
import { insertAuditLogRow } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().max(500).optional(),
});

/**
 * Client-reported sign-in UI errors (Clerk). Rate-limited per IP when Redis is configured.
 */
export async function POST(req: Request) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";

  const { allowed } = await checkRateLimit(`signInFailureAudit:${ip}`, { auditIp: ip });
  if (!allowed) {
    return Response.json({ ok: false }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const message = parsed.data.message?.trim() || "sign_in_error";

  await insertAuditLogRow({
    action: "FAILED_LOGIN",
    userId: null,
    details: { message, source: "clerk_sign_in_ui" },
    ipAddress: ip,
  });

  return Response.json({ ok: true });
}
