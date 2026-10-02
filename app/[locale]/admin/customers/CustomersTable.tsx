"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Customer {
  email: string;
  name: string;
  totalOrders: number;
  lifetimeSpend: number;
  lastActive: Date | null;
}

interface CustomersTableProps {
  customers: Customer[];
  initialQuery?: string;
  initialSort?: string;
}

const SORT_OPTIONS = [
  { value: "spend-desc", label: "Highest Spenders ↓" },
  { value: "spend-asc", label: "Lowest Spenders ↑" },
  { value: "orders-desc", label: "Most Orders ↓" },
  { value: "orders-asc", label: "Fewest Orders ↑" },
];

export function CustomersTable({
  customers,
  initialQuery = "",
  initialSort = "spend-desc",
}: CustomersTableProps) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(initialSort);

  const visibleCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? customers.filter(
          (customer) =>
            customer.email.toLowerCase().includes(q) || customer.name.toLowerCase().includes(q),
        )
      : customers;
    const sorted = [...rows];
    if (sort === "spend-asc") {
      sorted.sort((a, b) => a.lifetimeSpend - b.lifetimeSpend);
    } else if (sort === "orders-desc") {
      sorted.sort((a, b) => b.totalOrders - a.totalOrders);
    } else if (sort === "orders-asc") {
      sorted.sort((a, b) => a.totalOrders - b.totalOrders);
    } else {
      sorted.sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
    }
    return sorted;
  }, [customers, query, sort]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    if (sort && sort !== "spend-desc") params.set("sort", sort);
    else params.delete("sort");
    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [query, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-md border border-border">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Customer
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Total Orders
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Lifetime Spend
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Last Active
              </th>
              <th className="text-right px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No customers found
                </td>
              </tr>
            ) : (
              visibleCustomers.map((customer) => (
                <tr
                  key={customer.email}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {customer.email}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{customer.totalOrders}</td>
                  <td className="px-4 py-3">
                    ${customer.lifetimeSpend.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {customer.lastActive
                      ? new Date(customer.lastActive).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(customer.email)}`}
                      className="inline-block text-foreground hover:underline"
                    >
                      View Details
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
