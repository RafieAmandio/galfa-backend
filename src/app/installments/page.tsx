import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminInstallmentView } from "@/features/installment/components/admin-installment-view";

export default async function InstallmentsPage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  return <AdminInstallmentView user={user} />;
}
