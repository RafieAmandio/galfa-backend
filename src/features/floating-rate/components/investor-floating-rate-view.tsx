"use client";

import InvestorFloatingRateInvestmentsTable from "@/features/floating-rate/views/investor-floating-rate-investments-table";
import type { AuthUser } from "@/lib/auth/server-auth-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUserQueryOptions } from "@/features/floating-rate/actions/get-floating-rate-investments-with-monthly-performance-of-current-user/query-options";

interface MonthlyRedemption {
  amount: number;
  transactionDate: Date;
  description: string | null;
  status: string;
}

interface CurrentMonthPerformance {
  growthRate: number;
  performanceRate: number;
  appliedRule: string;
  hasPerformanceData: boolean;
  message: string;
  redemptions: MonthlyRedemption[];
}

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  presentValueFund: number;
  gainedFund: number;
  totalRedemptions: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  currentMonthPerformance: CurrentMonthPerformance;
}

interface InvestorFloatingRateViewProps {
  user: AuthUser;
}

export function InvestorFloatingRateView({
  user,
}: InvestorFloatingRateViewProps) {
  // Fetch data using Tanstack React Query
  const queryClient = useQueryClient();
  const {
    data: result,
    isLoading,
    error,
  } = useQuery(
    getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUserQueryOptions()
  );

  const handleRefresh = () => {
    // This will be handled by the query client invalidation
    queryClient.invalidateQueries(
      getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUserQueryOptions()
    );
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">
            Loading your floating rate investments...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-full">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-600 mb-4">
              {error instanceof Error
                ? error.message
                : "Failed to load your floating rate investments"}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = result?.success ? result.data : null;

  return (
    <div className="w-full max-w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Floating Rate Investments
        </h1>
        <p className="text-gray-600">
          View your floating rate investment performance with real-time market
          adjustments and redemption tracking.
        </p>
      </div>

      {data && <InvestorFloatingRateInvestmentsTable data={data} />}
    </div>
  );
}
