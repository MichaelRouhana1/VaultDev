"use client";

import { Link } from "@/i18n/navigation";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { setAdminStoreType } from "@/actions/admin-store";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  initialStore: "streetwear" | "formal";
}

export function AdminHeader({ onMenuClick, initialStore }: AdminHeaderProps) {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentStore, setCurrentStore] = useState(initialStore);

  const email = user?.primaryEmailAddress?.emailAddress ?? "admin@vault.com";

  const toggleStore = async (newStore: "streetwear" | "formal") => {
    if (newStore === currentStore) return;
    const previous = currentStore;
    setCurrentStore(newStore);
    startTransition(async () => {
      const res = await setAdminStoreType(newStore);
      if (res.success === false) {
        setCurrentStore(previous);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-[3.5rem] flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-3 py-2 md:h-14 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="-ml-1 rounded-md p-2 text-foreground hover:bg-muted md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link
          href="/"
          className="truncate text-sm font-medium text-foreground transition-opacity hover:opacity-70"
        >
          Vault
        </Link>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:flex-1 sm:gap-3 md:w-auto md:justify-end md:gap-4">
        <div className="flex w-full min-w-0 flex-col gap-1 rounded-md bg-muted p-1 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => toggleStore("streetwear")}
            disabled={isPending}
            aria-label="Switch to streetwear store"
            className={`rounded-sm px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all sm:px-3 sm:text-xs ${
              currentStore === "streetwear"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Streetwear
          </button>
          <button
            type="button"
            onClick={() => toggleStore("formal")}
            disabled={isPending}
            aria-label="Switch to classic store"
            className={`rounded-sm px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all sm:px-3 sm:text-xs ${
              currentStore === "formal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Classic
          </button>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <span className="max-w-[100px] truncate text-xs text-muted-foreground sm:max-w-[160px] md:max-w-[200px] md:text-sm">
          {email}
        </span>
      </div>
    </header>
  );
}
