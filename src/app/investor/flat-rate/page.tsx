import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { getInvestorSummary } from "@/features/investor/actions/get-investor-summary";
import { InvestorFlatRateView } from "@/features/investor/components/investor-flat-rate-view";

export default async function InvestorFlatRatePage() {
  // Authenticate user on server side
  const user = await requireAuth();

  // Fetch investor summary on server side
  let summary = null;
  let error: string | undefined = undefined;

  try {
    summary = await getInvestorSummary(user.email);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Failed to load flat rate investment data";
    console.error("Error fetching investor summary:", err);
  }

  return <InvestorFlatRateView user={user} summary={summary} error={error} />;
}
