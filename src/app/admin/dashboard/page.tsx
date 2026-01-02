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

  return (
    <div className="container mx-auto px-4 py-8 rounded-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Monthly analytics and insights for all investment types including
          floating rate performance
        </p>
      </div>

      <AdminDashboardView user={user} dashboardData={dashboardData} />
    </div>
  );
}
