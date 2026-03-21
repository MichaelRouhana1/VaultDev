import { and, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

/** Links all guest orders with this email to the Clerk user and clears activation fields. */
export async function linkGuestOrdersToUser(userId: string, emailLower: string): Promise<void> {
  await db
    .update(orders)
    .set({
      userId,
      activationToken: null,
      activationTokenExpires: null,
    })
    .where(
      and(isNull(orders.userId), sql`lower(trim(${orders.guestEmail})) = ${emailLower}`),
    );
}
