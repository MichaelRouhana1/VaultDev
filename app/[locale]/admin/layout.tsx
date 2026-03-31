import { AdminLayoutClient } from "@/components/AdminLayoutClient";
import { getAdminStoreType } from "@/actions/admin-store";
import { requireAdmin } from "@/lib/security";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const storeType = await getAdminStoreType();
  return <AdminLayoutClient initialStore={storeType}>{children}</AdminLayoutClient>;
}
