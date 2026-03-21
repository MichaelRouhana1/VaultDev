import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { GuestPasswordRegistrationForm } from "@/components/GuestPasswordRegistrationForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { linkGuestOrdersToUser } from "@/lib/link-guest-orders";
import { getValidActivationOrder } from "@/lib/order-activation";

export const metadata = {
  title: "Activate account | VAULT",
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; orderId?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token?.trim();
  const orderIdRaw = sp.orderId ? parseInt(sp.orderId, 10) : NaN;

  if (!token || !Number.isInteger(orderIdRaw) || orderIdRaw < 1) {
    return (
      <div className="pt-14">
        <div className="container mx-auto max-w-md px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Invalid link</CardTitle>
              <CardDescription>Use the activation link from your order email.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href="/">Home</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const order = await getValidActivationOrder(orderIdRaw, token);
  if (!order) {
    return (
      <div className="pt-14">
        <div className="container mx-auto max-w-md px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Link expired or invalid</CardTitle>
              <CardDescription>
                Request a new order confirmation email or contact support if you need help.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href="/">Home</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (order.userId) {
    return (
      <div className="pt-14">
        <div className="container mx-auto max-w-md px-4 py-16 text-center">
          <Card>
            <CardHeader>
              <CardTitle>Already activated</CardTitle>
              <CardDescription>This order is already linked to an account.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button asChild>
                <Link href="/account">My account</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const email = order.guestEmail!.trim().toLowerCase();
  const client = await clerkClient();
  const existing = await client.users.getUserList({ emailAddress: [email] });

  if (existing.data.length > 0) {
    await linkGuestOrdersToUser(existing.data[0].id, email);
    return (
      <div className="pt-14">
        <div className="container mx-auto max-w-md px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Orders linked</CardTitle>
              <CardDescription>
                Your guest orders for <span className="font-medium text-foreground">{email}</span> are
                now connected to your existing account. Sign in to view them.
              </CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full sm:flex-1">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:flex-1">
                <Link href="/">Home</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const firstName = order.customerName.trim().split(/\s+/)[0] || "";

  return (
    <div className="pt-14">
      <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-12">
        <GuestPasswordRegistrationForm
          orderId={order.id}
          activationToken={token}
          email={email}
          welcomeName={firstName}
          variant="activate"
        />
      </div>
    </div>
  );
}
