"use server";

import { cookies } from "next/headers";
import { clearActivationCookies } from "@/lib/order-activation-cookies";

/** Removes HttpOnly activation cookies (e.g. after linking orders or invalidating the flow). */
export async function clearOrderActivationCookies(): Promise<void> {
  const store = await cookies();
  clearActivationCookies(store);
}
