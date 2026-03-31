import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getContactExport } from "@/actions/getContactExport";
import { CopyContactButton } from "@/components/admin/CopyContactButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomersTable } from "./CustomersTable";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim().toLowerCase();
  const sort = params.sort ?? "spend-desc";

  const orderList = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));

  const customerMap = new Map<
    string,
    {
      email: string;
      name: string;
      totalOrders: number;
      lifetimeSpend: number;
      lastActive: Date | null;
    }
  >();

  for (const order of orderList) {
    const email =
      (order.guestEmail ?? order.userId ?? "unknown").toLowerCase();
    const existing = customerMap.get(email);

    const total = parseFloat(String(order.totalAmount));
    const orderDate = new Date(order.createdAt);

    if (existing) {
      existing.totalOrders += 1;
      existing.lifetimeSpend += total;
      if (
        !existing.lastActive ||
        orderDate.getTime() > existing.lastActive.getTime()
      ) {
        existing.lastActive = orderDate;
      }
      if (order.customerName && !existing.name) {
        existing.name = order.customerName;
      }
    } else {
      customerMap.set(email, {
        email: order.guestEmail ?? order.userId ?? "—",
        name: order.customerName ?? "—",
        totalOrders: 1,
        lifetimeSpend: total,
        lastActive: orderDate,
      });
    }
  }

  let customers = Array.from(customerMap.values());

  if (q) {
    customers = customers.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    );
  }

  if (sort === "spend-desc") {
    customers.sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
  } else if (sort === "spend-asc") {
    customers.sort((a, b) => a.lifetimeSpend - b.lifetimeSpend);
  } else if (sort === "orders-desc") {
    customers.sort((a, b) => b.totalOrders - a.totalOrders);
  } else if (sort === "orders-asc") {
    customers.sort((a, b) => a.totalOrders - b.totalOrders);
  }

  const contactExport = await getContactExport();
  const exportEmails = contactExport.ok ? contactExport.emails : [];
  const exportPhones = contactExport.ok ? contactExport.phones : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers</h1>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Export contacts</CardTitle>
          <CardDescription>
            Copy unique guest emails and phone numbers from all orders for use in external tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <CopyContactButton data={exportEmails} label="Copy unique emails" />
          <CopyContactButton data={exportPhones} label="Copy unique phone numbers" />
        </CardContent>
      </Card>

      <CustomersTable
        customers={customers}
        initialQuery={params.q}
        initialSort={sort}
      />
    </div>
  );
}

