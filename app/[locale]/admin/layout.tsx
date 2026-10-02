import { AdminLayoutClient } from "@/components/AdminLayoutClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, storeType] = await Promise.all([requireAdmin(), getAdminStoreType()]);
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to content
      </a>
      <AdminLayoutClient initialStore={storeType}>{children}</AdminLayoutClient>
    </>
  );
}
