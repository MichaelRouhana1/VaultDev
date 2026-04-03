"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { SignOutButton } from "@clerk/nextjs";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Hero", href: "/admin/hero" },
  { label: "Landing", href: "/admin/landing" },
  { label: "Get the Look", href: "/admin/look" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Attributes", href: "/admin/attributes" },
  { label: "Collections", href: "/admin/collections" },
  { label: "Products", href: "/admin/products" },
  { label: "Promo Codes", href: "/admin/promos" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Security logs", href: "/admin/logs" },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function AdminSidebarNav({
  pathname,
  onNavigate,
  theme,
  toggleTheme,
}: {
  pathname: string | null;
  onNavigate: () => void;
  theme: string | undefined;
  toggleTheme: () => void;
}) {
  return (
    <>
      <div className="border-b border-border p-6">
        <Link href="/admin" onClick={onNavigate} className="text-lg font-bold tracking-tight">
          VAULT Admin
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive =
            href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`block px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-border p-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <SignOutButton>
          <button
            type="button"
            onClick={onNavigate}
            className="flex w-full items-center px-4 py-3 text-left text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Logout
          </button>
        </SignOutButton>
      </div>
    </>
  );
}

export function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const closeSidebar = () => onClose?.();

  return (
    <>
      {/* Desktop: fixed rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background md:flex">
        <AdminSidebarNav
          pathname={pathname}
          onNavigate={() => {}}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </aside>

      {/* Mobile: slide-over */}
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <SheetContent
          side="left"
          className="flex h-dvh min-h-0 w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none md:hidden"
        >
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebarNav
            pathname={pathname}
            onNavigate={closeSidebar}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
