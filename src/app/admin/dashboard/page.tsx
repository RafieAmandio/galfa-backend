import { requireAdminOrRedirectToSummary } from "@/lib/auth/server-auth-helpers";
import { AdminDashboardView } from "@/features/admin/components/admin-dashboard-view";
import { startOfMonth } from "date-fns";
import { getFixRatePrincipleByMonth } from "@/features/flat-rate/actions/get-fix-rate-principle-by-month";
import { getFixRateCoFByMonth } from "@/features/flat-rate/actions/get-fix-rate-cof-by-month";
import { getInflowByMonth } from "@/features/investments/actions/get-inflow-by-month";
import { getOutflowByMonth } from "@/features/investments/actions/get-outflow-by-month";
import { getVCPerformanceByMonth } from "@/features/investments/actions/get-vc-performance-by-month";
import { getGrossProfitByMonth } from "@/features/investments/actions/get-gross-profit-by-month";
import { getInstallmentPrincipleByMonth } from "@/features/installment/actions/get-installment-principle-by-month";
import { getInstallmentCoFByMonth } from "@/features/installment/actions/get-installment-cof-by-month";
import { getFloatingRatePrincipleByMonth } from "@/features/floating-rate/actions/get-floating-rate-principle-by-month";
import { getFloatingRateAllocatedProfit } from "@/features/floating-rate/actions/get-floating-rate-allocated-profit";
import { getFloatingRateGrowthPercentage } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage";

export default async function AdminDashboardPage() {
  // Authenticate admin user on server side
  const user = await requireAdminOrRedirectToSummary();

  // Get current month for default data
  const currentDate = new Date();
  const currentMonth = startOfMonth(currentDate);

  // Fetch all dashboard data server-side
  let dashboardData = null;
  let error: string | undefined = undefined;

  try {
    // Fetch all data in parallel
    const [
      principleResult,
      cofResult,
      inflowResult,
      outflowResult,
      vcPerformanceResult,
      grossProfitResult,
      installmentPrincipleResult,
      installmentCoFResult,
      floatingRatePrincipleResult,
      floatingRateAllocatedProfitResult,
      floatingRateGrowthResult,
    ] = await Promise.all([
      getFixRatePrincipleByMonth(currentMonth),
      getFixRateCoFByMonth(currentMonth),
      getInflowByMonth(currentMonth),
      getOutflowByMonth(currentMonth),
      getVCPerformanceByMonth(currentMonth),
      getGrossProfitByMonth(currentMonth),
      getInstallmentPrincipleByMonth(currentMonth),
      getInstallmentCoFByMonth(currentMonth),
      getFloatingRatePrincipleByMonth(currentMonth),
      getFloatingRateAllocatedProfit(currentMonth),
      getFloatingRateGrowthPercentage(currentMonth),
    ]);

    // Process results and collect any errors
    const errors: string[] = [];

    // Process successful results
    const principleData = principleResult.success
      ? principleResult.data || null
      : null;
    const cofData = cofResult.success ? cofResult.data || null : null;
    const inflowData = inflowResult.success ? inflowResult.data || null : null;
    const outflowData = outflowResult.success
      ? outflowResult.data || null
      : null;
    const vcPerformanceData = vcPerformanceResult.success
      ? vcPerformanceResult.data || null
      : null;
    const grossProfitData = grossProfitResult.success
      ? grossProfitResult.data || null
      : null;
    const installmentPrincipleData = installmentPrincipleResult.success
      ? installmentPrincipleResult.data || null
      : null;
    const installmentCoFData = installmentCoFResult.success
      ? installmentCoFResult.data || null
      : null;
    const floatingRatePrincipleData = floatingRatePrincipleResult.success
      ? floatingRatePrincipleResult.data || null
      : null;
    const floatingRateAllocatedProfitData =
      floatingRateAllocatedProfitResult.success
        ? floatingRateAllocatedProfitResult.data || null
        : null;
    const floatingRateGrowthData = floatingRateGrowthResult.success
      ? floatingRateGrowthResult.data || null
      : null;

    // Collect error messages
    if (!principleResult.success) errors.push(principleResult.message);
    if (!cofResult.success) errors.push(cofResult.message);
    if (!inflowResult.success) errors.push(inflowResult.message);
    if (!outflowResult.success) errors.push(outflowResult.message);
    if (!vcPerformanceResult.success) errors.push(vcPerformanceResult.message);
    if (!grossProfitResult.success) errors.push(grossProfitResult.message);

    // Collect warnings
    const vcPerformanceWarning =
      vcPerformanceResult.success &&
      vcPerformanceResult.message &&
      (vcPerformanceResult.message.includes("Warning:") ||
        (!vcPerformanceResult.data && vcPerformanceResult.message))
        ? vcPerformanceResult.message
        : null;

    const grossProfitWarning =
      grossProfitResult.success &&
      grossProfitResult.message &&
      grossProfitResult.message.includes("No AUM data found")
        ? grossProfitResult.message
        : null;

    const floatingRateWarning =
      floatingRateAllocatedProfitResult.success &&
      floatingRateAllocatedProfitResult.message &&
      floatingRateAllocatedProfitResult.message.includes("Warning:")
        ? floatingRateAllocatedProfitResult.message
        : null;

    // Set error if we have critical errors
    if (errors.length > 0) {
      error = errors.join("; ");
    }

    // Package all data
    dashboardData = {
      selectedMonth: currentMonth,
      principleData,
      cofData,
      inflowData,
      outflowData,
      vcPerformanceData,
      grossProfitData,
      installmentPrincipleData,
      installmentCoFData,
      floatingRatePrincipleData,
      floatingRateAllocatedProfitData,
      floatingRateGrowthData,
      warnings: {
        vcPerformanceWarning,
        grossProfitWarning,
        floatingRateWarning,
      },
    };
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load dashboard data";
    console.error("Error fetching dashboard data:", err);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Monthly analytics and insights for all investment types including
          floating rate performance
        </p>
      </div>

      <AdminDashboardView
        user={user}
        dashboardData={dashboardData}
        error={error}
      />
    </div>
  );
}
