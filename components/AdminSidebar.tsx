"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { SignOutButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Hero", href: "/admin/hero" },
  { label: "Get the Look", href: "/admin/look" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Products", href: "/admin/products" },
  { label: "Promo Codes", href: "/admin/promos" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open = true, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const closeSidebar = () => onClose?.();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar - always fixed so content isn't pushed down */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border flex flex-col transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-border">
          <Link href="/admin" onClick={closeSidebar} className="text-lg font-bold tracking-tight">
            MOSAIK Admin
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href }) => {
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`block px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors text-left"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <SignOutButton>
            <button
              type="button"
              onClick={closeSidebar}
              className="w-full flex items-center px-4 py-3 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              Logout
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
