import { requireAdmin } from "@/lib/auth/server-auth-helpers";
import { getAllInvestors } from "@/features/investor/actions/get-all-investors";
import { AdminReportsView } from "@/features/reports/components/admin-reports-view";

export default async function AdminReportsPage() {
  // Ensure user is admin
  await requireAdmin();

  // Fetch all investors
  const investors = await getAllInvestors();

  return <AdminReportsView investors={investors} />;
}
