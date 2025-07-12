import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { getComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import { InvestorSummaryView } from "@/features/investor/components/investor-summary-view";

export default async function InvestorSummaryPage() {
  // Authenticate user on server side
  const user = await requireAuth();

  // Fetch comprehensive summary on server side
  let summary = null;
  let error: string | undefined = undefined;

  try {
    summary = await getComprehensiveInvestorSummary(user.email);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load portfolio data";
    console.error("Error fetching comprehensive summary:", err);
  }

  return <InvestorSummaryView user={user} summary={summary} error={error} />;
}
