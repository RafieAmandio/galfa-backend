import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { InvestorFloatingRateView } from "@/features/floating-rate/components/investor-floating-rate-view";
import { getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUser } from "@/features/floating-rate/actions/get-floating-rate-investments-with-monthly-performance-of-current-user";

export default async function InvestorFloatingRatePage() {
  // Authenticate user on server side
  const user = await requireAuth();

  // Server-side data fetching
  let floatingRateData = null;
  let error: string | undefined = undefined;

  try {
    const result =
      await getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUser();

    if (result.success && result.data) {
      floatingRateData = result.data;
    } else {
      error = result.message;
    }
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Failed to load your floating rate investments";
  }

  return (
    <InvestorFloatingRateView
      user={user}
      data={floatingRateData}
      error={error}
    />
  );
}
