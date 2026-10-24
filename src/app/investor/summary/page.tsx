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

  // Sequential to avoid exhausting Supabase connection pool
  try {
    summary = await getComprehensiveInvestorSummary(user.email);
  } catch (e) { console.error("Summary fetch failed:", e); }

  try {
    const faResult = await getFundAllocationsSummary();
    if (faResult.success && faResult.data) fundAllocations = faResult.data;
  } catch (e) { console.error("Fund allocations fetch failed:", e); }

  try {
    const vpResult = await getAllVCPerformance({ pageSize: 100 });
    if (vpResult.success && vpResult.data) {
      vcPerformance = [...vpResult.data].reverse().map((r) => ({
        date: r.date, aum: r.aum,
        monthlyGrossRoi: r.monthlyGrossRoi, monthlyNettRoi: r.monthlyNettRoi,
      }));
    }
  } catch (e) { console.error("VC performance fetch failed:", e); }

  return (
    <InvestorSummaryView
      user={user}
      summary={summary}
      fundAllocations={fundAllocations}
      vcPerformance={vcPerformance}
    />
  );
}
