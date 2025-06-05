"use client";

import React from "react";
import { getFlatRateInvestments } from "../actions/get-flat-rate-investments";
import { getPrincipleFixRate } from "../actions/get-principle-fix-rate";
import { useEffect, useState } from "react";

export function FlatRateInvestmentsTable() {
  const [investments, setInvestments] = useState<
    Awaited<ReturnType<typeof getFlatRateInvestments>>
  >([]);
  const [principleFixRate, setPrincipleFixRate] =
    useState<Awaited<ReturnType<typeof getPrincipleFixRate>>>();
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [investmentsData, principleFixRateData] = await Promise.all([
          getFlatRateInvestments(),
          getPrincipleFixRate(),
        ]);
        setInvestments(investmentsData);
        setPrincipleFixRate(principleFixRateData);
      } catch (error) {
        console.error("Error fetching data:", error);
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
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Principle Fix Rate Summary Box */}
      {principleFixRate && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Principle Fix Rate Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Gross Capital:</span>
              <span className="font-medium text-black">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(principleFixRate.totalGrossCapital)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Admin Fee (
                {(principleFixRate.adminFeePercentage * 100).toFixed(1)}%):
              </span>
              <span className="font-medium text-red-600">
                -
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(principleFixRate.totalAdminFee)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-gray-600 font-medium">
                Total Net Capital:
              </span>
              <span className="font-semibold text-green-600">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(principleFixRate.totalNetCapital)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Cost of Funds:</span>
              <span className="font-medium text-black">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(principleFixRate.totalCoF)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Investments Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
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
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trans Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Annualized CoF
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Rates
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {investments.map((investment, index) => (
              <React.Fragment key={index}>
                {/* Main Investment Row */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {investment.name}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(investment.netCapital)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {investment.rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(investment.transDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(investment.endDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(investment.annualizedCoF)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => toggleExpansion(index)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {expandedRows.has(index) ? "Hide Rates" : "Show Rates"}
                      <svg
                        className={`ml-1 h-3 w-3 transform transition-transform ${
                          expandedRows.has(index) ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>

                {/* Monthly Rates Rows - Only show if expanded */}
                {expandedRows.has(index) && (
                  <>
                    {/* Header row for monthly rates */}
                    <tr className="bg-blue-50">
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Monthly Details for {investment.name}
                      </td>
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Month
                      </td>
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Days
                      </td>
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Beginning Balance
                      </td>
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Interest Earned
                      </td>
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Ending Balance
                      </td>
                      <td className="px-6 py-2 text-xs font-medium text-blue-700">
                        Monthly Rate
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                    {/* Individual monthly data rows */}
                    {investment.monthlyData.map((monthData) => (
                      <tr
                        key={monthData.monthYear}
                        className="bg-blue-25 border-l-4 border-blue-200"
                      >
                        <td className="px-6 py-1"></td>
                        <td className="px-6 py-1 text-sm text-gray-700">
                          {monthData.monthYear}
                        </td>
                        <td className="px-6 py-1 text-sm text-center text-gray-600">
                          {monthData.daysInPeriod}
                        </td>
                        <td className="px-6 py-1 text-sm text-gray-900">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          }).format(monthData.beginningBalance)}
                        </td>
                        <td className="px-6 py-1 text-sm text-green-600 font-medium">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          }).format(monthData.monthlyInterest)}
                        </td>
                        <td className="px-6 py-1 text-sm text-blue-600 font-medium">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          }).format(monthData.endingBalance)}
                        </td>
                        <td className="px-6 py-1 text-sm text-center text-gray-600">
                          {(monthData.effectiveRate * 100).toFixed(4)}%
                        </td>
                        <td colSpan={2}></td>
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
  );
}
