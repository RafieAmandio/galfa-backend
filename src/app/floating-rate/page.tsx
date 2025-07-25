import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { getFloatingRateInvestmentsWithMonthlyPerformance } from "@/features/floating-rate/actions/get-floating-rate-investments-with-monthly-performance";
import { getAllInvestors } from "@/features/floating-rate/actions/create-floating-rate-account";
import { getFloatingRateAccountsForRedemption } from "@/features/floating-rate/actions/get-floating-rate-accounts-for-redemption";
import { AdminFloatingRateView } from "@/features/floating-rate/components/admin-floating-rate-view";

export default async function FloatingRatePage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  // Server-side data fetching
  let floatingRateData = null;
  let investorEmails = null;
  let initialRedemptionAccounts = null;
  let error: string | undefined = undefined;

  try {
    // Fetch all required data in parallel
    const [floatingRateResult, investorsResult, redemptionAccountsResult] =
      await Promise.all([
        getFloatingRateInvestmentsWithMonthlyPerformance(),
        getAllInvestors(),
        getFloatingRateAccountsForRedemption(new Date()), // Initial accounts for today
      ]);

    if (floatingRateResult.success) {
      floatingRateData = floatingRateResult.data || null;
    } else {
      error = floatingRateResult.message;
    }

    // Investors result is just an array, not a result object
    investorEmails = investorsResult;

    // Initial redemption accounts for today
    initialRedemptionAccounts = redemptionAccountsResult;
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load floating rate data";
  }

  // Pass all data to client View component
  return (
    <AdminFloatingRateView
      user={user}
      floatingRateData={floatingRateData}
      investorEmails={investorEmails}
      initialRedemptionAccounts={initialRedemptionAccounts}
      error={error}
    />
  );
}
