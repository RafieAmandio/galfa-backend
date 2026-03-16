"use client";

import { AuthUser } from "@/lib/auth/server-auth-helpers";
import FloatingRateInvestmentsMonthlyTable from "@/features/floating-rate/views/floating-rate-investments-monthly-table";
import { CreateFloatingRateModal } from "@/features/floating-rate/components/create-floating-rate-modal";
import { RedeemFloatingRateModal } from "@/features/floating-rate/components/redeem-floating-rate-modal";
import { useQuery } from "@tanstack/react-query";
import {
  getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimizedQueryOptions,
  PaginationParams,
} from "@/features/floating-rate/actions/get-floating-rate-investments-with-monthly-performance-paginated-optimized/query-options";
import { clearFloatingRateCaches } from "@/features/floating-rate/actions/get-floating-rate-investments-with-monthly-performance-paginated-optimized/cache";
import { getAllInvestorsQueryOptions } from "@/features/investor/actions/get-all-investors/query-options";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

interface MonthlyPerformance {
  month: Date;
  monthLabel: string;
  performanceRate: number;
  growthRate: number;
  previousMonthValue: number;
  presentValueFund: number;
  gainedFund: number;
  isFirstMonth: boolean;
  daysActive: number;
  totalDaysInMonth: number;
  appliedRule: string;
  hasData: boolean;
}

interface FloatingRateInvestmentWithMonthly {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  monthlyPerformance: MonthlyPerformance[];
  totalMonthsActive: number;
  presentValueFund: number;
  totalGainedFund: number;
}

export interface FloatingRateDataWithMonthly {
  investments: FloatingRateInvestmentWithMonthly[];
  totalGrossCapital: number;
  totalNetInvestorFund: number;
  totalAdminFees: number;
  totalPresentValueFund: number;
  totalGainedFund: number;
  activeAccountsCount: number;
  availableMonths: string[];
}

interface AdminFloatingRateViewProps {
  user: AuthUser;
}

export function AdminFloatingRateView({ user }: AdminFloatingRateViewProps) {
  const queryClient = useQueryClient();

  // Pagination state
  const [paginationParams, setPaginationParams] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: "transaction_date",
    sortOrder: "desc",
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  // Fetch data using Tanstack React Query with pagination (OPTIMIZED VERSION)
  const {
    data: floatingRateResult,
    isLoading: isFloatingRateLoading,
    error: floatingRateError,
  } = useQuery(
    getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimizedQueryOptions(
      paginationParams
    )
  );

  const {
    data: investorEmails,
    isLoading: isInvestorsLoading,
    error: investorsError,
  } = useQuery(getAllInvestorsQueryOptions());

  // Extract data and handle loading/error states
  const floatingRateData =
    floatingRateResult &&
    typeof floatingRateResult === "object" &&
    "success" in floatingRateResult &&
    floatingRateResult.success
      ? (floatingRateResult as any).data
      : null;
  const error = floatingRateError?.message || investorsError?.message;

  const isLoading = isFloatingRateLoading || isInvestorsLoading;

  // Handle refresh by invalidating queries and clearing caches
  const handleRefresh = () => {
    // Clear server-side caches
    clearFloatingRateCaches();

    // Invalidate client-side queries
    queryClient.invalidateQueries({
      queryKey: [
        "floating-rate-investments-monthly-performance-paginated-optimized",
      ],
    });
    queryClient.invalidateQueries(getAllInvestorsQueryOptions());
  };

  // Handle pagination changes
  const handlePaginationChange = (newParams: Partial<PaginationParams>) => {
    setPaginationParams((prev) => ({
      ...prev,
      ...newParams,
      // Reset to page 1 when changing filters
      page:
        newParams.search !== undefined ||
        newParams.status !== undefined ||
        newParams.dateFrom !== undefined ||
        newParams.dateTo !== undefined
          ? 1
          : newParams.page || prev.page,
    }));
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full">
        <div className="flex gap-3 items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
          <div className="text-lg">Loading floating rate investments...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-full">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <h3 className="text-lg font-medium">Error loading data</h3>
            <p className="mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Floating Rate Investments
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor floating rate investment accounts
            </p>
          </div>
          <div className="flex gap-2">
            <CreateFloatingRateModal investorEmails={investorEmails || []} />
            <RedeemFloatingRateModal onRedemptionComplete={handleRefresh} />
          </div>
        </div>
      </div>

      {floatingRateData && (
        <FloatingRateInvestmentsMonthlyTable
          data={floatingRateData}
          paginationParams={paginationParams}
          onPaginationChange={handlePaginationChange}
          onDeleted={handleRefresh}
        />
      )}
    </div>
  );
}
