"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/actions/updateOrderStatus";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

interface UpdateOrderStatusProps {
  orderId: number;
  currentStatus: string;
}

function statusHint(status: string): string {
  if (status === "CANCELLED") {
    return "This order is cancelled. Items were returned to inventory and the order cannot be reopened.";
  }
  if (status === "SHIPPED" || status === "DELIVERED") {
    return "Cancel is unavailable after ship or deliver — stock is not returned once the order has left.";
  }
  return "Cancelling a pending or processing order returns items to inventory.";
}

export function UpdateOrderStatus({ orderId, currentStatus }: UpdateOrderStatusProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCancelled = status === "CANCELLED";

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setIsPending(true);
    setError(null);
    const result = await updateOrderStatus(orderId, newStatus);
    setIsPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setStatus(newStatus);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Order status
      </label>
      <Select
        value={status}
        onValueChange={handleChange}
        disabled={isPending || isCancelled}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => {
            const disableCancel =
              opt.value === "CANCELLED" && (status === "SHIPPED" || status === "DELIVERED");
            return (
              <SelectItem key={opt.value} value={opt.value} disabled={disableCancel}>
                {opt.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{statusHint(status)}</p>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
