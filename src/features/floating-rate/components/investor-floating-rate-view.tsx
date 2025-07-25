"use client";

import InvestorFloatingRateInvestmentsTable from "@/features/floating-rate/views/investor-floating-rate-investments-table";
import type { AuthUser } from "@/lib/auth/server-auth-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { FloatingRateDataWithMonthly } from "./admin-floating-rate-view";

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
  data: FloatingRateDataWithMonthly | null;
  error?: string;
}

export function InvestorFloatingRateView({
  user,
  data,
  error,
}: InvestorFloatingRateViewProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Floating Rate Investments
        </h1>
        <p className="text-gray-600">
          View your floating rate investment performance with real-time market
          adjustments and redemption tracking.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <InvestorFloatingRateInvestmentsTable data={data} />
      )}
    </div>
  );
}
