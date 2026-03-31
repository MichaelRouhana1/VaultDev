"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { markAllNotificationsRead } from "@/actions/adminNotifications";
import { Button } from "@/components/ui/button";

interface MarkAllNotificationsReadButtonProps {
  disabled?: boolean;
}

export function MarkAllNotificationsReadButton({ disabled }: MarkAllNotificationsReadButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const r = await markAllNotificationsRead();
      if (!r.ok) {
        toast.error("Could not update notifications");
        return;
      }
      toast.success("All notifications marked as read");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={handleClick}
      className="shrink-0"
    >
      {pending ? "Updating…" : "Mark all as read"}
    </Button>
  );
}
