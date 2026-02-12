"use client";

import { useState } from "react";
import { createBrowserClient } from "@/db/supabase/browser";
import { format } from "date-fns";

interface InvestmentDetail {
  accountNumber: string;
  netInvestedAmount: number;
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
  totalNetPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  activeInvestments: number;
  investments: InvestmentDetail[];
}

interface InvestorFlatRateViewProps {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
  summary: InvestorSummary | null;
  error?: string;
}

export function InvestorFlatRateView({
  user,
  summary,
  error,
}: InvestorFlatRateViewProps) {
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

  const formatDate = (date: Date | null) => {
    if (!date) return "Ongoing";
    return format(new Date(date), "d MMMM yyyy");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Flat Rate Investments
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track your flat rate investment portfolio with compound interest
              calculations and detailed performance metrics.
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
                  Unable to Load Flat Rate Investments
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
                No Flat Rate Investments
              </h3>
              <p className="text-gray-600">
                You don't have any flat rate investments yet. Contact your
                advisor to get started.
              </p>
            </div>
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="space-y-8">
            {/* Portfolio Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Portfolio Summary
                </h2>
                <p className="text-gray-600">
                  Your flat rate investment performance overview
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    Amount actively working
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
                      Total Gain/Loss
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
                  <p className="text-sm text-purple-700">Investment accounts</p>
                </div>
              </div>
            </div>

            {/* Investment Details Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Investment Details
                </h2>
                <p className="text-gray-600">
                  Detailed breakdown of all your flat rate investments
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Account Number</th>
                      <th className="px-6 py-3">Net Amount</th>
                      <th className="px-6 py-3">Current Value</th>
                      <th className="px-6 py-3">Gain/Loss</th>
                      <th className="px-6 py-3">Annual Rate</th>
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3">Days</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.investments.map((investment, index) => (
                      <tr key={index} className="bg-white border-b">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {investment.accountNumber}
                        </td>
                        <td className="px-6 py-4">
                          {formatCurrency(investment.netInvestedAmount)}
                        </td>
                        <td className="px-6 py-4">
                          {formatCurrency(investment.currentValue)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-semibold ${
                              investment.gainLoss >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(investment.gainLoss)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {(investment.annualRate * 100).toFixed(2)}%
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(investment.startDate)}
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(investment.endDate)}
                        </td>
                        <td className="px-6 py-4">{investment.daysInvested}</td>
                        <td className="px-6 py-4">
                          {investment.isRollover ? (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Rollover #{investment.rolloverSequence}
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              Initial
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navigation
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  View Other Investments
                </h2>
                <p className="text-gray-600">
                  Access your complete portfolio across all investment types
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                <a
                  href="/investor/summary"
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Complete Portfolio
                </a>
                <a
                  href="/investor/floating-rate"
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Floating Rate
                </a>
                <a
                  href="/investor/installments"
                  className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                >
                  Installments
                </a>
              </div>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}
