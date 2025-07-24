"use client";

import { useState } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import type { ComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";

interface InvestorSummaryViewProps {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
  summary: ComprehensiveInvestorSummary | null;
  error?: string;
}

export function InvestorSummaryView({
  user,
  summary,
  error,
}: InvestorSummaryViewProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

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
                Manage your complete investment portfolio and track performance
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Complete Investment Portfolio
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get comprehensive insights into all your investments including
              flat rate, floating rate, and installment investments with
              real-time performance tracking.
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="max-w-2xl mx-auto text-center">
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
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!summary && !error && (
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
                No Active Investments
              </h3>
              <p className="text-gray-600">
                You don't have any active investments yet. Contact your advisor
                to get started.
              </p>
            </div>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="space-y-8">
            {/* Overall Portfolio Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Portfolio Overview
                </h2>
                <p className="text-gray-600">
                  Your complete investment performance across all investment
                  types
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                      Total Net Fund
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
                    Total amount actively working
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
                    Current portfolio value
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
                      Total Performance
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
                    {summary.totalGainLossPercentage.toFixed(2)}% overall return
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
                  <p className="text-sm text-purple-700">
                    Total investment accounts
                  </p>
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

            {/* Investment Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Flat Rate Investments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Flat Rate Investments
                  </h3>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 12a1 1 0 100-2 1 1 0 000 2zM10 12a1 1 0 110-2 1 1 0 010 2zM11 12a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  </div>
                </div>
                {summary.flatRateInvestments.hasData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Net Fund</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          summary.flatRateInvestments.totalNetInvestedFund
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Current Value
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          summary.flatRateInvestments.totalNetPresentValue
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gain/Loss</span>
                      <span
                        className={`text-sm font-semibold ${
                          summary.flatRateInvestments.totalGainLoss >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(
                          summary.flatRateInvestments.totalGainLoss
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Accounts</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {summary.flatRateInvestments.activeInvestments}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      No records available
                    </p>
                  </div>
                )}
              </div>

              {/* Floating Rate Investments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Floating Rate Investments
                  </h3>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5 12a1 1 0 100-2 1 1 0 000 2zM10 12a1 1 0 100-2 1 1 0 000 2zM15 12a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  </div>
                </div>
                {summary.floatingRateInvestments.hasData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Net Capital</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          summary.floatingRateInvestments.totalNetCapital
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gained Fund</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          summary.floatingRateInvestments.totalGainedFund
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gain/Loss</span>
                      <span
                        className={`text-sm font-semibold ${
                          summary.floatingRateInvestments.totalGainedFund -
                            summary.floatingRateInvestments.totalNetCapital >=
                          0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(
                          summary.floatingRateInvestments.totalGainedFund -
                            summary.floatingRateInvestments.totalNetCapital
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Accounts</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {summary.floatingRateInvestments.activeInvestments}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      No records available
                    </p>
                  </div>
                )}
              </div>

              {/* Installment Investments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Installment Investments
                  </h3>
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                    </svg>
                  </div>
                </div>
                {summary.installmentInvestments.hasData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Net Fund</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          summary.installmentInvestments.totalNetInvestorFund
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Redeemed</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          summary.installmentInvestments.totalRedeemedAmount
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gain/Loss</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(
                          summary.installmentInvestments.totalRedeemedAmount
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Accounts</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {summary.installmentInvestments.activeInvestments}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      No records available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Detailed Investment Views
                </h2>
                <p className="text-gray-600">
                  Access detailed analysis and performance tracking for each
                  investment type
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summary.flatRateInvestments.hasData ? (
                  <a
                    href="/investor/flat-rate"
                    className="block p-6 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-blue-900">
                        Flat Rate Details
                      </h3>
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-blue-700">
                      View detailed breakdown of your flat rate investments with
                      compound interest calculations
                    </p>
                  </a>
                ) : (
                  <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-500">
                        Flat Rate Details
                      </h3>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      No flat rate investments available
                    </p>
                  </div>
                )}

                {summary.floatingRateInvestments.hasData ? (
                  <a
                    href="/investor/floating-rate"
                    className="block p-6 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-green-900">
                        Floating Rate Details
                      </h3>
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-green-700">
                      Track your floating rate investments with real-time market
                      adjustments
                    </p>
                  </a>
                ) : (
                  <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-500">
                        Floating Rate Details
                      </h3>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      No floating rate investments available
                    </p>
                  </div>
                )}

                {summary.installmentInvestments.hasData ? (
                  <a
                    href="/investor/installments"
                    className="block p-6 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-purple-900">
                        Installment Details
                      </h3>
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-purple-700">
                      Monitor your installment investment schedule and net
                      investor fund
                    </p>
                  </a>
                ) : (
                  <div className="block p-6 bg-gray-50 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-500">
                        Installment Details
                      </h3>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">
                      No installment investments available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
