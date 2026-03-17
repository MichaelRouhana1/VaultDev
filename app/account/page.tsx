import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems, wishlists, products, productVariants } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductCard } from "@/components/ProductCard";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export default async function AccountPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const [userOrders, userWishlist] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt)),
    db
      .select({
        wishlistId: wishlists.id,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: products,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt)),
  ]);

  const wishlistProductIds = userWishlist.map((w) => w.productId);
  const wishlistVariants =
    wishlistProductIds.length > 0
      ? await db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, wishlistProductIds))
      : [];
  const variantsByProductId = wishlistVariants.reduce<Record<number, typeof productVariants.$inferSelect[]>>(
    (acc, v) => {
      if (!acc[v.productId]) acc[v.productId] = [];
      acc[v.productId].push(v);
      return acc;
    },
    {}
  );

  const ordersWithItems = await Promise.all(
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
      return { ...order, items };
    })
  );

  return (
    <div className="pt-14">
      <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
        <h1 className="text-2xl font-bold">My Account</h1>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Order history</CardTitle>
              <CardDescription>Your past orders</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersWithItems.length === 0 ? (
                <p className="text-muted-foreground">No orders yet.</p>
              ) : (
                <ul className="space-y-6">
                  {ordersWithItems.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">Order #{order.id}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${order.status === "DELIVERED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : order.status === "CANCELLED"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {order.status}
                        </span>
                        <span className="font-semibold">
                          ${typeof order.totalAmount === "string" ? order.totalAmount : String(order.totalAmount)}
                        </span>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {order.items.map((item, i) => (
                          <li key={i}>
                            {item.productName} · {item.size} × {item.quantity} · $
                            {typeof item.priceAtPurchase === "string"
                              ? item.priceAtPurchase
                              : String(item.priceAtPurchase)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Wishlist</CardTitle>
              <CardDescription>Products you&apos;ve saved for later</CardDescription>
            </CardHeader>
            <CardContent>
              {userWishlist.length === 0 ? (
                <p className="text-muted-foreground">Your wishlist is empty.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {userWishlist.map(({ product }) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variants={variantsByProductId[product.id] ?? []}
                      inWishlist
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        <section>
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Privacy Settings</CardTitle>
              <CardDescription>Manage your data and account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Permanently remove your personal data from VAULT. Your past orders will be anonymized for financial records, but will no longer be linked to you.
                </p>
                <DeleteAccountButton />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
