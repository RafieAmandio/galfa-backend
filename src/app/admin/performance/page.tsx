import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { PerformanceTable } from "@/features/investments/views/performance-table";

export default async function PerformancePage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  return (
    <div className="container mx-auto py-8 px-4">
      <PerformanceTable />
    </div>
  );
}
