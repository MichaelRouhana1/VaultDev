import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = decodeURIComponent(id);
  if (!email) notFound();

  const customerOrders = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.guestEmail, email),
        eq(orders.userId, email)
      )
    )
    .orderBy(desc(orders.createdAt));

  if (customerOrders.length === 0) notFound();

  const firstOrder = customerOrders[customerOrders.length - 1];
  const customerName = firstOrder.customerName ?? "—";
  const joinedDate = firstOrder.createdAt;
  const totalSpend = customerOrders.reduce(
    (sum, o) => sum + parseFloat(String(o.totalAmount)),
    0
  );

  return (
    <div>
      <Link
        href="/admin/customers"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to customers
      </Link>
      <h1 className="text-2xl font-bold mb-8">Customer Details</h1>

      <div className="border border-border rounded-md p-6 mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Profile
        </h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {customerName}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {email}
          </p>
          <p>
            <span className="text-muted-foreground">Joined:</span>{" "}
            {new Date(joinedDate).toLocaleDateString()}
          </p>
          <p>
            <span className="text-muted-foreground">Total orders:</span>{" "}
            {customerOrders.length}
          </p>
          <p>
            <span className="text-muted-foreground">Lifetime spend:</span> $
            {totalSpend.toFixed(2)}
          </p>
        </div>
      </div>

      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
        Order History
      </h2>
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Order
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {customerOrders.map((order) => (
              <tr
                key={order.id}
                className="border-t border-border hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-sm font-medium tabular-nums hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium uppercase bg-muted">
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  $
                  {typeof order.totalAmount === "string"
                    ? order.totalAmount
                    : String(order.totalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
