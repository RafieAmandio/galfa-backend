import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { getComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import { getFundAllocationsSummary } from "@/features/fund-allocations/actions/get-fund-allocations";
import { getAllVCPerformance } from "@/features/investments/actions/get-all-vc-performance";
import { InvestorSummaryView } from "@/features/investor/components/investor-summary-view";

export const maxDuration = 30;

export default async function InvestorSummaryPage() {
  const user = await requireAuth();

  // Fetch each independently — one slow query won't block the others
  let summary = null;
  let fundAllocations = null;
  let vcPerformance: { date: Date; aum: number; monthlyGrossRoi: number | null; monthlyNettRoi: number | null }[] = [];

  const [summaryResult, fundAllocationsResult, vcPerformanceResult] = await Promise.allSettled([
    getComprehensiveInvestorSummary(user.email),
    getFundAllocationsSummary(),
    getAllVCPerformance({ pageSize: 100 }),
  ]);

  if (summaryResult.status === "fulfilled") {
    summary = summaryResult.value;
  }

  if (fundAllocationsResult.status === "fulfilled" && fundAllocationsResult.value.success && fundAllocationsResult.value.data) {
    fundAllocations = fundAllocationsResult.value.data;
  }

  if (vcPerformanceResult.status === "fulfilled" && vcPerformanceResult.value.success && vcPerformanceResult.value.data) {
    vcPerformance = vcPerformanceResult.value.data
      .reverse()
      .map((record) => ({
        date: record.date,
        aum: record.aum,
        monthlyGrossRoi: record.monthlyGrossRoi,
        monthlyNettRoi: record.monthlyNettRoi,
      }));
  }

  return (
    <InvestorSummaryView
      user={user}
      summary={summary}
      fundAllocations={fundAllocations}
      vcPerformance={vcPerformance}
    />
  );
}
