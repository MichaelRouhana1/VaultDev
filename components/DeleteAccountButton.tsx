"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/actions/deleteAccount";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteAccountButtonProps = {
  className?: string;
  variant?: "destructive" | "link";
  label?: string;
};

export function DeleteAccountButton({
  className,
  variant = "destructive",
  label = "Delete My Account & Personal Data",
}: DeleteAccountButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to permanently delete your account and personal data? This action cannot be undone.",
      )
    ) {
      startTransition(async () => {
        try {
          await deleteAccount();
        } catch {
          toast.error("Failed to delete account. Please try again.");
        }
      });
    }
  };

  return (
    <Button
      type="button"
      variant={variant === "link" ? "link" : "destructive"}
      onClick={handleDelete}
      disabled={isPending}
      className={cn(
        variant === "link" &&
          "h-auto justify-start p-0 text-xs font-semibold uppercase tracking-widest text-destructive hover:bg-transparent hover:text-destructive",
        className,
      )}
    >
      {isPending ? "Deleting…" : label}
    </Button>
  );
}
