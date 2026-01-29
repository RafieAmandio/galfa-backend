import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { FundAllocationsView } from "@/features/fund-allocations/components/fund-allocations-view";
import { getFundAllocationsSummary } from "@/features/fund-allocations/actions/get-fund-allocations";

export const dynamic = "force-dynamic";

export default async function AdminFundAllocationsPage() {
  const user = await requireAdminOrRedirectToSummary();
  const allocationsResult = await getFundAllocationsSummary();

  return (
    <FundAllocationsView
      user={user}
      initialData={allocationsResult.data || { totalAum: 0, totalAllocations: 0, allocations: [] }}
    />
  );
}
