"use client";

import React, { useEffect, useState } from "react";
import { getInvestorInstallmentInvestments } from "../actions/get-installments";
import { parse } from "date-fns";

interface InvestorInstallmentSummary {
  investorEmail: string;
  totalNetInvestorFund: number;
  totalRedeemedAmount: number;
  totalRedemptions: number;
  investments: any[];
}

interface InvestorInstallmentTableProps {
  investorEmail: string;
}

export function InvestorInstallmentTable({
  investorEmail,
}: InvestorInstallmentTableProps) {
  const [summary, setSummary] = useState<InvestorInstallmentSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getInvestorInstallmentInvestments(investorEmail);
        setSummary(data);
      } catch (error) {
        console.error("Error fetching investor installment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [investorEmail]);

  const toggleExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  if (!summary || summary.investments.length === 0) {
    return (
      <div className="text-center text-gray-500">
        No installment investments found.
      </div>
    );
  }

  // Calculate monthly summary for investor
  const monthlyNetFunds: { [monthYear: string]: number } = {};

  summary.investments.forEach((investment) => {
    investment.monthlyData.forEach((month: any) => {
      if (!monthlyNetFunds[month.monthYear]) {
        monthlyNetFunds[month.monthYear] = 0;
      }
      // For investor view, we track remaining capital after each payment
      monthlyNetFunds[month.monthYear] += month.netPresentValue;
    });
  });

  // Sort months chronologically instead of alphabetically
  const uniqueMonths = Object.keys(monthlyNetFunds).sort((a, b) => {
    // Parse the month strings (e.g., "Jan 2024") into dates for proper sorting
    const dateA = parse(a, "MMM yyyy", new Date());
    const dateB = parse(b, "MMM yyyy", new Date());
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Total Net Investor Fund
          </h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalNetInvestorFund)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Capital after admin fees</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Projected Amount
          </h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalRedeemedAmount)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Amount received back after redemption
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Total Redemptions
          </h3>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalRedemptions || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Early redemptions processed
          </p>
        </div>
      </div>

      {/* Monthly Net Fund Summary */}
      {uniqueMonths.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Monthly Net Investor Fund
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining Net Fund
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uniqueMonths.map((month) => (
                  <tr key={month}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(monthlyNetFunds[month])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Investments */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Your Installment Investments
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Capital
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Capital
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.investments.map((investment, index) => (
                <React.Fragment key={investment.id}>
                  {/* Main Investment Row */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {investment.accountNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investment.investmentType === "principle"
                            ? "bg-blue-100 text-blue-800"
                            : investment.investmentType === "interest_only"
                              ? "bg-green-100 text-green-800"
                              : investment.investmentType === "bullet"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {investment.investmentType === "principle"
                          ? "Principle + Interest"
                          : investment.investmentType === "interest_only"
                            ? "Interest Only"
                            : investment.investmentType === "bullet"
                              ? "Bullet"
                              : "Co. Menurun"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.grossCapital)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      -
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.adminFee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.netCapital)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {investment.durationMonths} months
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(investment.monthlyCof * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investment.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {investment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                      <button
                        onClick={() => toggleExpansion(index)}
                        className="hover:text-indigo-900"
                      >
                        {expandedRows.has(index) ? "Hide" : "Show"} Schedule
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Payment Schedule */}
                  {expandedRows.has(index) && (
                    <>
                      <tr className="bg-blue-50">
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Payment Schedule for {investment.accountNumber}
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Month
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Principal Payment
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Interest Payment
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Total Received
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Net Present Value
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                      {investment.monthlyData.map((monthData: any) => (
                        <tr
                          key={monthData.monthYear}
                          className="bg-blue-25 border-l-4 border-blue-200"
                        >
                          <td className="px-6 py-1"></td>
                          <td className="px-6 py-1 text-sm text-gray-700">
                            {monthData.monthYear}
                          </td>
                          <td className="px-6 py-1 text-sm text-gray-900">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.principalPayment)}
                          </td>
                          <td className="px-6 py-1 text-sm text-green-600 font-medium">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.interestPayment)}
                          </td>
                          <td className="px-6 py-1 text-sm text-blue-600 font-medium">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.totalPayment)}
                          </td>
                          <td className="px-6 py-1 text-sm text-gray-900">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                            }).format(monthData.netPresentValue)}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
