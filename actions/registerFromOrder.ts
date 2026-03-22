"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getClientIpFromHeaders } from "@/lib/audit";
import { linkGuestOrdersToUser } from "@/lib/link-guest-orders";
import { checkRegisterFromOrderLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  activationToken: z.string().uuid("Invalid activation link"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

export type RegisterFromOrderResult =
  | { ok: true; email: string; userExisted: boolean }
  | { ok: false; error: string };

/**
 * Guest completes registration using order activation token (success page or /activate-account).
 * Creates a Clerk user when none exists; links all guest orders with the same email to the user.
 * Client should call Clerk `signIn.create({ identifier: email, password })` when userExisted is false.
 */
export async function registerFromOrder(input: unknown): Promise<RegisterFromOrderResult> {
  const clientIp = await getClientIpFromHeaders();
  const limit = await checkRegisterFromOrderLimit(clientIp);
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.password?.[0] ??
      parsed.error.flatten().fieldErrors.activationToken?.[0] ??
      "Invalid input";
    return { ok: false, error: msg };
  }

  const { orderId, activationToken, password } = parsed.data;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.userId) return { ok: false, error: "This order is already linked to an account" };
  if (!order.guestEmail?.trim()) return { ok: false, error: "No email on this order" };
  if (order.activationToken !== activationToken) {
    return { ok: false, error: "Invalid or expired activation link" };
  }
  if (!order.activationTokenExpires || order.activationTokenExpires < new Date()) {
    return { ok: false, error: "This activation link has expired" };
  }

  const email = order.guestEmail.trim().toLowerCase();
  const client = await clerkClient();
  const existing = await client.users.getUserList({ emailAddress: [email] });

  if (existing.data.length > 0) {
    const userId = existing.data[0].id;
    await linkGuestOrdersToUser(userId, email);
    return { ok: true, email, userExisted: true };
  }

  const firstName = order.customerName.trim().split(/\s+/)[0] || "Friend";

  try {
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName: firstName.slice(0, 50),
    });

    await linkGuestOrdersToUser(clerkUser.id, email);

    return { ok: true, email, userExisted: false };
  } catch (e: unknown) {
    console.error("Clerk createUser failed", e);
    return {
      ok: false,
      error: "Could not create account. You may already have an account—try signing in.",
    };
  }
}
