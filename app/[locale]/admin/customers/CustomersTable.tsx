"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    router.push(`/admin/customers?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`/admin/customers?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs"
        />
        <Button onClick={handleSearch} variant="default">
          Search
        </Button>
        <Select value={initialSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[220px]">
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

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
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
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
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
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(customer.email)}`}
                      className="text-foreground hover:underline"
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
