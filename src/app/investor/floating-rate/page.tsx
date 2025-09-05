import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { InvestorFloatingRateView } from "@/features/floating-rate/components/investor-floating-rate-view";

export default async function InvestorFloatingRatePage() {
  // Authenticate user on server side
  const user = await requireAuth();

  // Pass user to client View component - data will be fetched client-side with Tanstack React Query
  return <InvestorFloatingRateView user={user} />;
}
