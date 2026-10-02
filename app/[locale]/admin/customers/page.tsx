import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/security";
import { CopyContactButton } from "@/components/admin/CopyContactButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomersTable } from "./CustomersTable";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort ?? "spend-desc";

  await requireAdmin();
  const orderList = await db
    .select({
      guestEmail: orders.guestEmail,
      userId: orders.userId,
      customerName: orders.customerName,
      phoneNumber: orders.phoneNumber,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
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

  const customers = Array.from(customerMap.values());

  const emailSet = new Map<string, string>();
  const phoneSet = new Set<string>();
  for (const order of orderList) {
    const email = order.guestEmail?.trim() ?? "";
    if (email.length > 0) {
      const key = email.toLowerCase();
      if (!emailSet.has(key)) emailSet.set(key, email);
    }
    const phone = order.phoneNumber?.trim() ?? "";
    if (phone.length > 0) phoneSet.add(phone);
  }
  const exportEmails = Array.from(emailSet.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  const exportPhones = Array.from(phoneSet).sort((a, b) => a.localeCompare(b));

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
          <CopyContactButton data={exportEmails} kind="emails" label="Copy unique emails" />
          <CopyContactButton data={exportPhones} kind="phones" label="Copy unique phone numbers" />
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

