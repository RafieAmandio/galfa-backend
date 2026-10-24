import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { InvestorSummaryView } from "@/features/investor/components/investor-summary-view";

export const maxDuration = 30;

export default async function InvestorSummaryPage() {
  const user = await requireAuth();

  // Pass user only — all data fetching happens client-side to avoid serverless timeout
  return <InvestorSummaryView user={user} summary={null} fundAllocations={null} vcPerformance={[]} />;
}
