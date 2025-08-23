import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminCapitalMarketAccountsView } from "@/features/capital-market/views/admin-capital-market-accounts-view";

export default async function AdminCapitalMarketPage() {
  // Authenticate admin user on server side
  await requireAdminOrRedirectToSummary();

  return <AdminCapitalMarketAccountsView />;
}
