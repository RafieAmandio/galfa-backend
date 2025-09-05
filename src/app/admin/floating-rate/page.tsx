import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminFloatingRateView } from "@/features/floating-rate/components/admin-floating-rate-view";

export default async function FloatingRatePage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  // Pass user to client View component - data will be fetched client-side with Tanstack React Query
  return <AdminFloatingRateView user={user} />;
}
