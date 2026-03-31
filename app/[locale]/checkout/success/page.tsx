import { Link } from "@/i18n/navigation";
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
import { orderNumberOrFallback } from "@/lib/order-reference";
import { getTranslations } from "next-intl/server";

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("CheckoutSuccess");
  const tNav = await getTranslations("Navbar");
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

  let displayOrderNumber: string | null = null;
  if (displayOrderId != null) {
    const [row] = await db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.id, displayOrderId))
      .limit(1);
    displayOrderNumber = orderNumberOrFallback(row?.orderNumber, displayOrderId);
  }

  if (sessionMissing && displayOrderId == null && guestUpsell == null) {
    return (
      <div className="pt-14">
        <div className="container mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-16 text-center">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("sessionError")}</p>
          </div>
          <Button asChild>
            <Link href="/">{t("continueShopping")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-14">
      <div className="container mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-16 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {displayOrderNumber != null ? (
            <p className="text-muted-foreground">
              {t("orderPrefix")}{" "}
              <strong className="font-mono tracking-tight text-foreground">{displayOrderNumber}</strong>{" "}
              {t("orderSuffix")}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("orderPlacedGeneric")}</p>
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
          <Card className="w-full max-w-md text-start">
            <ActivationCookieCleanup />
            <CardHeader>
              <CardTitle className="text-lg">{t("trackTitle")}</CardTitle>
              <CardDescription>{t("trackDescription", { email: guestUpsell.email })}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/sign-in">{tNav("signIn")}</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {guestUpsell?.mode === "linked_now" && (
          <Card className="w-full max-w-md text-start">
            <ActivationCookieCleanup />
            <CardHeader>
              <CardTitle className="text-lg">{t("linkedTitle")}</CardTitle>
              <CardDescription>{t("linkedDescription", { email: guestUpsell.email })}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/account">{t("myAccount")}</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        <Button asChild variant={guestUpsell ? "outline" : "default"}>
          <Link href="/">{t("continueShopping")}</Link>
        </Button>
      </div>
    </div>
  );
}
