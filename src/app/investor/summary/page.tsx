"use client";

import { useState, useTransition, useEffect } from "react";
import { getInvestorSummary } from "@/features/investor/actions/get-investor-summary";
import { createBrowserClient } from "@/db/supabase/browser";
import type { User } from "@supabase/supabase-js";

interface InvestmentDetail {
  accountNumber: string;
  netInvestedAmount: number;
  grossInvestedAmount: number;
  adminFee: number;
  startDate: Date;
  endDate: Date | null;
  annualRate: number;
  isRollover: boolean;
  rolloverSequence: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  daysInvested: number;
}

interface InvestorSummary {
  email: string;
  totalNetInvestedFund: number;
  totalGrossInvestedFund: number;
  totalAdminFees: number;
  totalNetPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  activeInvestments: number;
  investments: InvestmentDetail[];
}

export default function InvestorSummaryPage() {
  const [summary, setSummary] = useState<InvestorSummary | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user?.email) {
        setEmail(user.email);
        // Automatically fetch summary when user is authenticated
        fetchSummaryForEmail(user.email);
      }
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        setEmail(session.user.email);
        // Automatically fetch summary when user is authenticated
        fetchSummaryForEmail(session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const fetchSummaryForEmail = (userEmail: string) => {
    if (!userEmail.trim()) {
      setError("No email address found");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const result = await getInvestorSummary(userEmail);

        if (!result) {
          setError("No active investments found for your account");
          setSummary(null);
          return;
        }

        setSummary(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setSummary(null);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You need to be logged in to view this page.
          </p>
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* User Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.email}
              </h1>
              <p className="text-gray-600">
                Manage your investment portfolio and track performance
              </p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Investment Portfolio Dashboard
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get comprehensive insights into your investment performance,
              including current values, gains/losses, and detailed portfolio
              breakdown.
            </p>
          </div>
        </div>

        {/* Loading or Error State */}
        {(isPending || error) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="max-w-2xl mx-auto text-center">
              {isPending && (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-lg text-gray-700">
                    Loading your portfolio...
                  </span>
                </div>
              )}
              {error && !isPending && (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Unable to Load Portfolio
                  </h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <button
                    onClick={() => fetchSummaryForEmail(email)}
                    className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!summary && !isPending && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Loading Your Portfolio
              </h3>
              <p className="text-gray-600">
                Please wait while we fetch your investment data...
              </p>
            </div>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Portfolio Overview
                </h2>
                <p className="text-gray-600">
                  Your investment performance and key metrics
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                      Net Fund Working
                    </h3>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-900 mb-1 break-all">
                    {formatCurrency(summary.totalNetInvestedFund)}
                  </p>
                  <p className="text-sm text-green-700">
                    Amount actively earning returns
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                      Current Value
                    </h3>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-900 mb-1 break-all">
                    {formatCurrency(summary.totalNetPresentValue)}
                  </p>
                  <p className="text-sm text-blue-700">
                    Including compound interest
                  </p>
                </div>

                <div
                  className={`bg-gradient-to-br p-6 rounded-xl border ${
                    summary.totalGainLoss >= 0
                      ? "from-emerald-50 to-emerald-100 border-emerald-200"
                      : "from-red-50 to-red-100 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className={`text-sm font-semibold uppercase tracking-wide ${
                        summary.totalGainLoss >= 0
                          ? "text-emerald-800"
                          : "text-red-800"
                      }`}
                    >
                      Portfolio Performance
                    </h3>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        summary.totalGainLoss >= 0
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {summary.totalGainLoss >= 0 ? (
                          <path
                            fillRule="evenodd"
                            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    </div>
                  </div>
                  <p
                    className={`text-xl font-bold mb-1 break-all ${
                      summary.totalGainLoss >= 0
                        ? "text-emerald-900"
                        : "text-red-900"
                    }`}
                  >
                    {formatCurrency(summary.totalGainLoss)}
                  </p>
                  <p
                    className={`text-sm ${
                      summary.totalGainLoss >= 0
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {summary.totalGainLossPercentage >= 0 ? "+" : ""}
                    {summary.totalGainLossPercentage.toFixed(2)}% return
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
                      Active Investments
                    </h3>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-purple-900 mb-1">
                    {summary.activeInvestments}
                  </p>
                  <p className="text-sm text-purple-700">Investment funds</p>
                </div>
              </div>

              {/* Additional Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Total Investment
                    </h3>
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-1 break-all">
                    {formatCurrency(summary.totalGrossInvestedFund)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Original investment amount
                  </p>
                </div>

                <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
                      Admin Fees Paid
                    </h3>
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-900 mb-1 break-all">
                    {formatCurrency(summary.totalAdminFees)}
                  </p>
                  <p className="text-sm text-orange-600">
                    Total fees paid to platform
                  </p>
                </div>
              </div>
            </div>

            {/* Investment Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Investment Breakdown
                </h2>
                <p className="text-gray-600">
                  Detailed view of each investment account and performance
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Account Number
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Net Amount
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Current Value
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Performance
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Annual Rate
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Days Active
                      </th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.investments.map((investment, index) => (
                      <tr
                        key={investment.accountNumber}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-6 px-4">
                          <div className="font-semibold text-gray-900 text-sm">
                            {investment.accountNumber}
                          </div>
                        </td>
                        <td className="py-6 px-4 text-right">
                          <div className="font-semibold text-gray-900 text-sm break-all">
                            {formatCurrency(investment.netInvestedAmount)}
                          </div>
                        </td>
                        <td className="py-6 px-4 text-right">
                          <div className="font-bold text-blue-900 text-sm break-all">
                            {formatCurrency(investment.currentValue)}
                          </div>
                        </td>
                        <td className="py-6 px-4 text-right">
                          <div
                            className={`font-bold text-sm break-all ${
                              investment.gainLoss >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(investment.gainLoss)}
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              investment.gainLoss >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {investment.gainLossPercentage >= 0 ? "+" : ""}
                            {investment.gainLossPercentage.toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-6 px-4 text-right">
                          <div className="font-semibold text-gray-900 text-sm">
                            {(investment.annualRate * 100).toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-6 px-4 text-right">
                          <div className="font-medium text-gray-700 text-sm">
                            {investment.daysInvested} days
                          </div>
                        </td>
                        <td className="py-6 px-4 text-center">
                          {investment.isRollover ? (
                            <span className="inline-flex items-center px-2 md:px-3 py-1 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                              Rollover #{investment.rolloverSequence}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 md:px-3 py-1 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              Original
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
