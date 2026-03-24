import Link from "next/link";
import { db } from "@/db";
import { products, orders } from "@/db/schema";
import { sql, desc, gte, eq } from "drizzle-orm";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminDashboardPage() {
  const storeType = await getAdminStoreType();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [totalProducts, totalOrders, revenue30d, orders7d, recentOrders] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.storeType, storeType)),
      db.select({ count: sql<number>`count(*)::int` }).from(orders),
      db
        .select({
          total: sql<string>`coalesce(sum(${orders.totalAmount})::text, '0')`,
        })
        .from(orders)
        .where(gte(orders.createdAt, thirtyDaysAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(gte(orders.createdAt, sevenDaysAgo)),
      db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5),
    ]);

  const totalProductsCount = totalProducts[0]?.count ?? 0;
  const totalOrdersCount = totalOrders[0]?.count ?? 0;
  const revenue30dValue = parseFloat(revenue30d[0]?.total ?? "0");
  const orders7dCount = orders7d[0]?.count ?? 0;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full capitalize">
          Managing: {storeType}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard
          title={`${storeType} Products`}
          value={totalProductsCount}
          href="/admin/products"
        />
        <StatCard
          title="Global Orders"
          value={totalOrdersCount}
          href="/admin/orders"
        />
        <StatCard title="Global Revenue (30D)" value={`$${revenue30dValue.toFixed(2)}`} />
        <StatCard title="Global Orders (7D)" value={orders7dCount} />
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Recent Orders
        </h2>
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                  Email
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
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No orders yet
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">{order.id}</td>
                    <td className="px-4 py-3">
                      {order.guestEmail ?? order.userId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      ${typeof order.totalAmount === "string" ? order.totalAmount : String(order.totalAmount)}
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
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string | number;
  href?: string;
}) {
  return (
    <div className="border border-border rounded-md p-6 bg-background">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <p className="text-2xl font-bold">{value}</p>
      {href && (
        <Link
          href={href}
          className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      )}
    </div>
  );
}
