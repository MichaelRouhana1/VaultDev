import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UpdateOrderStatus } from "@/components/UpdateOrderStatus";
import { OrderNumberWithCopy } from "@/components/orders/OrderNumberWithCopy";
import { orderNumberOrFallback } from "@/lib/order-reference";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) notFound();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) notFound();

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

  const email = order.guestEmail ?? order.userId ?? "—";

  return (
    <div>
      <Link
        href="/admin/orders"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to orders
      </Link>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order</h1>
        <OrderNumberWithCopy
          orderNumber={orderNumberOrFallback(order.orderNumber, order.id)}
          monoClassName="text-xl"
        />
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="border border-border rounded-md p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Customer
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{email}</dd>
            </div>
            {order.customerName && (
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd>{order.customerName}</dd>
              </div>
            )}
            {order.phoneNumber && (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{order.phoneNumber}</dd>
              </div>
            )}
            {order.addressLine1 && (
              <div>
                <dt className="text-muted-foreground">Address</dt>
                <dd>
                  {order.addressLine1}
                  {order.city && `, ${order.city}`}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border border-border rounded-md overflow-x-auto">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground p-4 border-b border-border">
            Items
          </h2>
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-left px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">{item.productName}</td>
                  <td className="px-4 py-3">{item.size}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    $
                    {typeof item.priceAtPurchase === "string"
                      ? item.priceAtPurchase
                      : String(item.priceAtPurchase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-border flex justify-end">
            <span className="font-semibold">
              Total: $
              {typeof order.totalAmount === "string"
                ? order.totalAmount
                : String(order.totalAmount)}
            </span>
          </div>
        </div>

        <div className="border border-border rounded-md p-6">
          <UpdateOrderStatus
            orderId={order.id}
            currentStatus={order.status}
          />
        </div>
      </div>
    </div>
  );
}
