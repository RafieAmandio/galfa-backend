"use client";

import React, { useEffect, useState } from "react";
import { getAdminInstallmentInvestments } from "../actions/get-installments";

interface AdminInstallmentSummary {
  totalGainedFunds: number;
  totalPresentValueFund: number;
  totalNetPresentValueFund: number;
  investments: any[];
  monthlyGainedFunds: { [monthYear: string]: number };
}

export function AdminInstallmentTable() {
  const [summary, setSummary] = useState<AdminInstallmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAdminInstallmentInvestments();
        setSummary(data);
      } catch (error) {
        console.error("Error fetching installment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (!summary) {
    return (
      <div className="text-center text-gray-500">
        No installment investments found.
      </div>
    );
  }

  // Get unique months for the monthly gains table
  const uniqueMonths = Object.keys(summary.monthlyGainedFunds).sort();

  // Calculate totals for summable columns (for the table footer)
  const totals = summary.investments.reduce(
    (acc, investment) => ({
      totalNetCapital: acc.totalNetCapital + investment.netCapital,
      totalPresentValueFund:
        acc.totalPresentValueFund + investment.presentValueFund,
      totalNetPresentValueFund:
        acc.totalNetPresentValueFund + investment.netPresentValueFund,
      totalGainedFunds: acc.totalGainedFunds + investment.totalGainedFunds,
    }),
    {
      totalNetCapital: 0,
      totalPresentValueFund: 0,
      totalNetPresentValueFund: 0,
      totalGainedFunds: 0,
    }
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Total Gained Funds
          </h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalGainedFunds)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Interest from all accounts
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Total Present Value Fund
          </h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalPresentValueFund)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Current value of all investments
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Net Present Value Fund
          </h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
            }).format(summary.totalNetPresentValueFund)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Present value - redeemed</p>
        </div>
      </div>

      {/* Monthly Gained Funds */}
      {uniqueMonths.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Monthly Gained Funds
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {uniqueMonths.map((month) => (
                    <th
                      key={month}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  {uniqueMonths.map((month) => (
                    <td
                      key={month}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(summary.monthlyGainedFunds[month])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Installment Investments
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
                  Investor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Capital
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly CoF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present Value Fund
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net PV Fund
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Gained
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {investment.investorEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          investment.investmentType === "principle"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {investment.investmentType === "principle"
                          ? "Principal"
                          : "Interest Only"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.presentValueFund)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.netPresentValueFund)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(investment.totalGainedFunds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                      <button
                        onClick={() => toggleExpansion(index)}
                        className="hover:text-indigo-900"
                      >
                        {expandedRows.has(index) ? "Hide" : "Show"} Details
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Monthly Details */}
                  {expandedRows.has(index) && (
                    <>
                      <tr className="bg-blue-50">
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Monthly Details for {investment.accountNumber}
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Month
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Principal
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Interest
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Total Payment
                        </td>
                        <td className="px-6 py-2 text-xs font-medium text-blue-700">
                          Net Present Value
                        </td>
                        <td colSpan={4}></td>
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
                          <td colSpan={4}></td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* Totals Row */}
              <tr className="bg-yellow-50 border-t-2 border-yellow-200 font-bold hover:bg-yellow-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                  TOTAL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(totals.totalNetCapital)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(totals.totalPresentValueFund)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-bold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(totals.totalNetPresentValueFund)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(totals.totalGainedFunds)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
