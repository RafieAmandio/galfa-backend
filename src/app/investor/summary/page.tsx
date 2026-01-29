import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { getComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import { getFundAllocationsSummary } from "@/features/fund-allocations/actions/get-fund-allocations";
import { getAllVCPerformance } from "@/features/investments/actions/get-all-vc-performance";
import { InvestorSummaryView } from "@/features/investor/components/investor-summary-view";

export default async function InvestorSummaryPage() {
  // Authenticate user on server side
  const user = await requireAuth();

  // Fetch comprehensive summary, fund allocations, and VC performance on server side
  let summary = null;
  let fundAllocations = null;
  let vcPerformance: { date: Date; aum: number }[] = [];
  let error: string | undefined = undefined;

  try {
    const [summaryResult, fundAllocationsResult, vcPerformanceResult] = await Promise.all([
      getComprehensiveInvestorSummary(user.email),
      getFundAllocationsSummary(),
      getAllVCPerformance(),
    ]);

    summary = summaryResult;

    if (fundAllocationsResult.success && fundAllocationsResult.data) {
      fundAllocations = fundAllocationsResult.data;
    }

    if (vcPerformanceResult.success && vcPerformanceResult.data) {
      vcPerformance = vcPerformanceResult.data
        .slice(0, 12)
        .reverse()
        .map((record) => ({
          date: record.date,
          aum: record.aum,
        }));
    }
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load portfolio data";
    console.error("Error fetching comprehensive summary:", err);
  }

  return (
    <InvestorSummaryView
      user={user}
      summary={summary}
      fundAllocations={fundAllocations}
      vcPerformance={vcPerformance}
      error={error}
    />
  );
}
