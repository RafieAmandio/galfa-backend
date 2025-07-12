import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { InvestorInstallmentView } from "@/features/installment/components/investor-installment-view";

export default async function InvestorInstallmentsPage() {
  // Authenticate user on server side
  const user = await requireAuth();

  return <InvestorInstallmentView user={user} />;
}
