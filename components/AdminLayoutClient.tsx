"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";

function reachedAdminTab(pathname: string, href: string): boolean {
  return pathname === href;
}

export function AdminLayoutClient({
  children,
  initialStore,
}: {
  children: React.ReactNode;
  initialStore: "streetwear" | "formal";
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (reachedAdminTab(pathname, pendingHref)) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const showSkeleton = pendingHref != null;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingHref={pendingHref}
        onTabIntent={(href) => {
          if (pathname === href) return;
          setPendingHref(href);
        }}
      />
      <div className="flex min-h-screen min-w-0 flex-col pl-0 md:pl-64">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} initialStore={initialStore} />
        <main id="main-content" className="min-w-0 flex-1 p-4 md:p-6" aria-busy={showSkeleton}>
          {showSkeleton ? <AdminPageSkeleton /> : null}
          <div hidden={showSkeleton} aria-hidden={showSkeleton}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
