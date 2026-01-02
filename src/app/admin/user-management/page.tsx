import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminUserManagementView } from "@/features/admin/components/admin-user-management-view";

export const dynamic = "force-dynamic";

export default async function AdminUserManagementPage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  return <AdminUserManagementView user={user} />;
}
