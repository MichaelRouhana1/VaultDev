"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught in Storefront Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Something went wrong!</h2>
      <p className="max-w-md text-muted-foreground">
        We had a little trouble communicating with our servers. Please try again.
      </p>
      <Button type="button" onClick={() => reset()} variant="default" className="mt-4">
        Try again
      </Button>
    </div>
  );
}
