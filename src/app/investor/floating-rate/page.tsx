import { requireAuth } from "@/lib/auth/server-auth-helpers";
import { InvestorFloatingRateView } from "@/features/floating-rate/components/investor-floating-rate-view";

export default async function InvestorFloatingRatePage() {
  // Authenticate user on server side
  const user = await requireAuth();

  return <InvestorFloatingRateView user={user} />;
}
