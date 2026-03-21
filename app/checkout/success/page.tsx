import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
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
import { getValidActivationOrder } from "@/lib/order-activation";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string; key?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderIdParam = params.orderId;
  const activationKey = params.key?.trim();
  const id = orderIdParam ? parseInt(orderIdParam, 10) : NaN;
  const { userId } = await auth();

  let displayOrderId: number | null = null;
  let guestUpsell:
    | { orderId: number; token: string; email: string; mode: "register" | "sign_in" }
    | null = null;

  if (Number.isInteger(id) && id > 0 && userId) {
    const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq(orders.id, id)).limit(1);
    if (order && order.userId === userId) {
      displayOrderId = id;
    }
  }

  if (
    displayOrderId == null &&
    Number.isInteger(id) &&
    id > 0 &&
    activationKey &&
    !userId
  ) {
    const order = await getValidActivationOrder(id, activationKey);
    if (order && order.guestEmail) {
      displayOrderId = id;
      const email = order.guestEmail.trim().toLowerCase();
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
  }

  return (
    <div className="pt-14">
      <div className="container mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-16 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Order confirmed</h1>
          {displayOrderId != null ? (
            <p className="text-muted-foreground">
              Your order <strong>#{displayOrderId}</strong> has been placed successfully.
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

        <Button asChild variant={guestUpsell ? "outline" : "default"}>
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
