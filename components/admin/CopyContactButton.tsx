"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyContactButtonProps {
  data: string[];
  label: string;
}

export function CopyContactButton({ data, label }: CopyContactButtonProps) {
  async function handleClick() {
    const lines = data.filter((s) => s.trim().length > 0);
    if (lines.length === 0) {
      toast.error("Nothing to copy");
      return;
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${lines.length} ${lines.length === 1 ? "line" : "lines"}`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} className="gap-2">
      <Copy className="size-4 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}
