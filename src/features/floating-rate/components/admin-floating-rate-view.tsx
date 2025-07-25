"use client";

import { AuthUser } from "@/lib/auth/server-auth-helpers";
import FloatingRateInvestmentsMonthlyTable from "@/features/floating-rate/views/floating-rate-investments-monthly-table";
import { CreateFloatingRateModal } from "@/features/floating-rate/components/create-floating-rate-modal";
import { RedeemFloatingRateModal } from "@/features/floating-rate/components/redeem-floating-rate-modal";

interface InvestorOption {
  id: string;
  email: string;
  fullName: string | null;
}

interface FloatingRateAccountForRedemption {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date;
  isRollover: boolean;
  currentValue: number;
  totalRedemptions: number;
  remainingPrincipal: number;
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
  floatingRateData: FloatingRateDataWithMonthly | null;
  investorEmails: InvestorOption[] | null;
  initialRedemptionAccounts: FloatingRateAccountForRedemption[] | null;
  error?: string;
}

export function AdminFloatingRateView({
  user,
  floatingRateData,
  investorEmails,
  initialRedemptionAccounts,
  error,
}: AdminFloatingRateViewProps) {
  // Handle refresh by reloading the page (server-side data will be re-fetched)
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6">
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
          <div className="flex items-center space-x-4">
            <RedeemFloatingRateModal
              initialRedemptionAccounts={initialRedemptionAccounts}
              onRedemptionComplete={handleRefresh}
            />
            <CreateFloatingRateModal
              investorEmails={investorEmails}
              onAccountCreated={handleRefresh}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <FloatingRateInvestmentsMonthlyTable data={floatingRateData} />
      )}
    </div>
  );
}
