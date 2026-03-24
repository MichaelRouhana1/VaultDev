import { NextResponse } from "next/server";
import { z } from "zod";
import { getValidActivationOrder } from "@/lib/order-activation";
import {
  ACTIVATION_ORDER_ID_COOKIE,
  ACTIVATION_TOKEN_COOKIE,
  getActivationCookieOptions,
} from "@/lib/order-activation-cookies";

const querySchema = z.object({
  token: z.string().uuid("Invalid token"),
  orderId: z.coerce.number().int().positive(),
});

/**
 * Email-safe handoff: one-time URL sets HttpOnly activation cookies, then redirects to a clean /activate-account.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    token: url.searchParams.get("token")?.trim() ?? undefined,
    orderId: url.searchParams.get("orderId") ?? undefined,
  });

  const base = new URL(req.url);
  const fail = (state: "invalid" | "expired") =>
    NextResponse.redirect(new URL(`/activate-account?state=${state}`, base.origin));

  if (!parsed.success) {
    return fail("invalid");
  }

  const { token, orderId } = parsed.data;
  const order = await getValidActivationOrder(orderId, token);
  if (!order) {
    return fail("expired");
  }

  const redirectUrl = new URL("/activate-account", base.origin);
  const res = NextResponse.redirect(redirectUrl);
  const opts = getActivationCookieOptions();
  res.cookies.set(ACTIVATION_TOKEN_COOKIE, token, opts);
  res.cookies.set(ACTIVATION_ORDER_ID_COOKIE, String(orderId), opts);
  return res;
}
