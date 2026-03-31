import { auth, currentUser } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, products, productColors } from "@/db/schema";
import { AccountPageClient, type AccountOrderDto } from "@/components/account/AccountPageClient";
import { parseVaultProfile, type VaultProfileStored } from "@/lib/account-vault-profile";

export default async function AccountPage() {
  const locale = await getLocale();
  const { userId } = await auth();
  if (!userId) {
    return redirect({ href: "/sign-in", locale });
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

  const toMoney = (v: unknown) => (typeof v === "string" ? v : String(v));

  const ordersWithItems: AccountOrderDto[] = await Promise.all(
    userOrders.map(async (order) => {
      const items = await db
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          size: orderItems.size,
          priceAtPurchase: orderItems.priceAtPurchase,
          productName: products.name,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

      const productIds = [...new Set(items.map((i) => i.productId))];
      const firstImageByProductId: Record<number, string | null> = {};
      if (productIds.length > 0) {
        const colorRows = await db
          .select({
            productId: productColors.productId,
            imageUrls: productColors.imageUrls,
            id: productColors.id,
          })
          .from(productColors)
          .where(inArray(productColors.productId, productIds))
          .orderBy(asc(productColors.productId), asc(productColors.id));
        for (const r of colorRows) {
          if (firstImageByProductId[r.productId] !== undefined) continue;
          const url = r.imageUrls?.[0];
          firstImageByProductId[r.productId] = url?.trim() ? url : null;
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        status: order.status,
        subtotalAmount: toMoney(order.subtotalAmount),
        shippingFee: toMoney(order.shippingFee),
        discountAmount: toMoney(order.discountAmount),
        totalAmount: toMoney(order.totalAmount),
        shipping: {
          name: order.customerName,
          phone: order.phoneNumber,
          line1: order.addressLine1,
          city: order.city,
        },
        items: items.map((item) => ({
          productName: item.productName,
          size: item.size,
          quantity: item.quantity,
          priceAtPurchase: toMoney(item.priceAtPurchase),
          productImageUrl: firstImageByProductId[item.productId] ?? null,
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
