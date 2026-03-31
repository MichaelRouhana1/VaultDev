import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminOrdersPage() {
  const orderList = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Orders</h1>

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Order
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </th>
              <th className="text-right px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No orders yet
                </td>
              </tr>
            ) : (
              orderList.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-mono text-sm tabular-nums">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    {order.guestEmail ?? order.userId ?? "—"}
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
                  <td className="px-4 py-3">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-foreground hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
