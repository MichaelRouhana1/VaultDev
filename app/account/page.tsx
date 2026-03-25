import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { AccountPageClient, type AccountOrderDto } from "@/components/account/AccountPageClient";
import { parseVaultProfile, type VaultProfileStored } from "@/lib/account-vault-profile";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const meta = (user?.publicMetadata ?? {}) as { vaultProfile?: unknown };
  const vaultProfile: VaultProfileStored | null = meta.vaultProfile
    ? parseVaultProfile(meta.vaultProfile)
    : null;

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const vaultTitle =
    firstName.trim().length > 0 ? `${firstName.trim()}'s Vault` : "Your Vault";

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  const ordersWithItems: AccountOrderDto[] = await Promise.all(
    userOrders.map(async (order) => {
      const items = await db
        .select({
          quantity: orderItems.quantity,
          size: orderItems.size,
          priceAtPurchase: orderItems.priceAtPurchase,
          productName: products.name,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));
      return {
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        status: order.status,
        totalAmount:
          typeof order.totalAmount === "string" ? order.totalAmount : String(order.totalAmount),
        items: items.map((item) => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          priceAtPurchase:
            typeof item.priceAtPurchase === "string"
              ? item.priceAtPurchase
              : String(item.priceAtPurchase),
        })),
      };
    }),
  );

  return (
    <div className="pt-14">
      <AccountPageClient
        vaultTitle={vaultTitle}
        email={email}
        initialFirstName={firstName}
        initialLastName={lastName}
        vaultProfile={vaultProfile}
        orders={ordersWithItems}
      />
    </div>
  );
}
