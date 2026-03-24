"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { setAdminStoreType } from "@/actions/admin-store";
import { useRouter } from "next/navigation";
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-foreground hover:bg-muted rounded-md"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link
          href="/"
          className="text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
        >
          Vault
        </Link>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        {/* Store Toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
          <button
            onClick={() => toggleStore("streetwear")}
            disabled={isPending}
            aria-label="Switch to streetwear store"
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${currentStore === "streetwear"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Streetwear
          </button>
          <button
            onClick={() => toggleStore("formal")}
            disabled={isPending}
            aria-label="Switch to formal store"
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-all ${currentStore === "formal"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Formal
          </button>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground transition-colors p-2"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <span className="text-sm text-muted-foreground truncate max-w-[200px]">{email}</span>
      </div>
    </header>
  );
}
