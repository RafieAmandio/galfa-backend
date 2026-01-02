import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminFlatRateView } from "@/features/flat-rate/components/admin-flat-rate-view";

export const dynamic = "force-dynamic";

export default async function AdminFlatRatePage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  return <AdminFlatRateView user={user} />;
}
