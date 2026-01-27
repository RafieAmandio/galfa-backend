import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminDashboardView } from "@/features/admin/components/admin-dashboard-view";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  // Get current month for default data
  const currentDate = new Date();
  const currentMonth = startOfMonth(currentDate);

  // All data will now be fetched client-side using React Query
  // This allows for dynamic month selection and real-time data updates
  const dashboardData = {
    selectedMonth: currentMonth,
    warnings: {
      vcPerformanceWarning: null,
      grossProfitWarning: null,
      floatingRateWarning: null,
    },
  };

  return <AdminDashboardView user={user} dashboardData={dashboardData} />;
}
