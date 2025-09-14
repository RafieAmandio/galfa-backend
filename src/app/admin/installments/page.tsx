import { AdminInstallmentView } from "@/features/installment/components/admin-installment-view";
import { getAllInvestors } from "@/features/investor/actions/get-all-investors";
import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";

export default async function InstallmentsPage() {
  await requireAdminOrRedirectToSummary();

  // Authenticate admin user on server side
  const investorEmails = await getAllInvestors();

  return <AdminInstallmentView investorEmails={investorEmails} />;
}
