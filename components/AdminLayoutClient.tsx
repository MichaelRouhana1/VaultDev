"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";

export function AdminLayoutClient({
  children,
  initialStore,
}: {
  children: React.ReactNode;
  initialStore: "streetwear" | "formal";
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-col pl-0 md:pl-64">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} initialStore={initialStore} />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
