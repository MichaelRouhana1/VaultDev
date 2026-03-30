import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ActivationCookieCleanup } from "@/components/ActivationCookieCleanup";
import { Button } from "@/components/ui/button";
import { GuestPasswordRegistrationForm } from "@/components/GuestPasswordRegistrationForm";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { clerkClient } from "@clerk/nextjs/server";
import { clerkUserExistsForEmail } from "@/lib/clerk-user-lookup";
import { linkGuestOrdersToUser } from "@/lib/link-guest-orders";
import {
  ACTIVATION_ORDER_ID_COOKIE,
  ACTIVATION_TOKEN_COOKIE,
} from "@/lib/order-activation-cookies";
import { getValidActivationOrder } from "@/lib/order-activation";
import { formatOrderReference } from "@/lib/order-reference";

export default async function CheckoutSuccessPage() {
  const cookieStore = await cookies();
  const orderIdRaw = cookieStore.get(ACTIVATION_ORDER_ID_COOKIE)?.value;
  const activationKey = cookieStore.get(ACTIVATION_TOKEN_COOKIE)?.value?.trim();
  const id = orderIdRaw ? parseInt(orderIdRaw, 10) : NaN;
  const { userId } = await auth();

  const hasValidOrderId = Number.isInteger(id) && id > 0;

  let displayOrderId: number | null = null;
  let guestUpsell:
    | { orderId: number; token: string; email: string; mode: "register" | "sign_in" | "linked_now" }
    | null = null;
  let sessionMissing = false;

  if (hasValidOrderId && activationKey) {
    const order = await getValidActivationOrder(id, activationKey);
    if (order?.guestEmail && !order.userId) {
      displayOrderId = id;
      const email = order.guestEmail.trim().toLowerCase();
      if (userId) {
        const client = await clerkClient();
        const me = await client.users.getUser(userId);
        const primary = me.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
        if (primary === email) {
          await linkGuestOrdersToUser(userId, email);
          guestUpsell = { orderId: id, token: activationKey, email, mode: "linked_now" };
        } else {
          sessionMissing = true;
        }
      } else {
        const hasAccount = await clerkUserExistsForEmail(email);
        if (hasAccount) {
          const client = await clerkClient();
          const list = await client.users.getUserList({ emailAddress: [email] });
          const uid = list.data[0]?.id;
          if (uid) await linkGuestOrdersToUser(uid, email);
          guestUpsell = { orderId: id, token: activationKey, email, mode: "sign_in" };
        } else {
          guestUpsell = { orderId: id, token: activationKey, email, mode: "register" };
        }
      }
    } else {
      sessionMissing = true;
    }
  } else if (hasValidOrderId && userId) {
    const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.id, id)).limit(1);
    if (order && order.userId === userId) {
      displayOrderId = id;
    } else {
      sessionMissing = true;
    }
  } else {
    sessionMissing = true;
  }

  if (sessionMissing && displayOrderId == null && guestUpsell == null) {
    return (
      <div className="pt-14">
        <div className="container mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-16 text-center">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Order confirmed</h1>
            <p className="text-muted-foreground">
              Session expired or we couldn&apos;t load this confirmation. If you just checked out, open the success
              page from the same browser, or check your email for your order details.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14">
      <div className="container mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-16 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Order confirmed</h1>
          {displayOrderId != null ? (
            <p className="text-muted-foreground">
              Order{" "}
              <strong className="font-mono tracking-tight text-foreground">
                {formatOrderReference(displayOrderId)}
              </strong>{" "}
              has been placed successfully.
            </p>
          ) : (
            <p className="text-muted-foreground">Your order has been placed successfully.</p>
          )}
        </div>

        {guestUpsell?.mode === "register" && (
          <GuestPasswordRegistrationForm
            orderId={guestUpsell.orderId}
            activationToken={guestUpsell.token}
            email={guestUpsell.email}
            variant="success"
          />
        )}

        {guestUpsell?.mode === "sign_in" && (
          <Card className="w-full max-w-md text-left">
            <ActivationCookieCleanup />
            <CardHeader>
              <CardTitle className="text-lg">Track your order</CardTitle>
              <CardDescription>
                You already have an account with {guestUpsell.email}. Sign in to see this order in your
                history—we&apos;ve linked it to your account.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {guestUpsell?.mode === "linked_now" && (
          <Card className="w-full max-w-md text-left">
            <ActivationCookieCleanup />
            <CardHeader>
              <CardTitle className="text-lg">Order linked</CardTitle>
              <CardDescription>
                This order is now on your account ({guestUpsell.email}). You can view it in your order history.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/account">My account</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        <Button asChild variant={guestUpsell ? "outline" : "default"}>
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
