"use client";

import { useEffect, useState } from "react";
import {
  getFloatingRateInvestments,
  getFloatingRatePerformance,
} from "../actions/get-floating-rate";
import { getLatestVCPerformance } from "../actions/get-vc-performance";
import { format } from "date-fns";

interface FloatingRateInvestment {
  name: string;
  capital: number;
  transDate: Date;
  endDate: Date;
  hurdleRate: number;
  monthlyRates: {
    [key: string]: number;
  };
}

interface FloatingRatePerformance {
  totalCapital: number;
  grossProfitForFloating: number;
  performancePercentage: number;
  floatingRate: number;
}

interface VCPerformance {
  date: Date;
  aum: number;
  grossProfit: number;
  roiPercentage: number;
  cofFixRate: number;
}

export default function FloatingRateInvestmentsTable() {
  const [investments, setInvestments] = useState<FloatingRateInvestment[]>([]);
  const [performance, setPerformance] =
    useState<FloatingRatePerformance | null>(null);
  const [vcPerformance, setVCPerformance] = useState<VCPerformance | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get latest VC performance data
        const vcData = await getLatestVCPerformance();
        setVCPerformance(vcData);

        if (vcData) {
          const [investmentsData, performanceData] = await Promise.all([
            getFloatingRateInvestments(),
            getFloatingRatePerformance(vcData.grossProfit),
          ]);
          setInvestments(investmentsData);
          setPerformance(performanceData);
        }
      } catch (error) {
        console.error("Error fetching floating rate data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique months from all investments
  const getUniqueMonths = () => {
    const months = new Set<string>();
    investments.forEach((investment) => {
      Object.keys(investment.monthlyRates).forEach((month) =>
        months.add(month)
      );
    });
    return Array.from(months).sort();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const uniqueMonths = getUniqueMonths();

  return (
    <div className="space-y-6">
      {/* VC Performance Summary */}
      {vcPerformance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">AUM</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(vcPerformance.aum)}
            </p>
            <p className="text-sm text-gray-500">
              {format(vcPerformance.date, "MMMM yyyy")}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Gross Profit
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(vcPerformance.grossProfit)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">ROI</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {vcPerformance.roiPercentage.toFixed(2)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">CoF Fix Rate</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {(vcPerformance.cofFixRate * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Floating Rate Performance */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Capital</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(performance.totalCapital)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Gross Profit for Floating
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(performance.grossProfitForFloating)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-500">
                Performance %
              </h3>
              <div className="group relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                  Performance % = (Gross Profit for Floating / Total Floating
                  Capital) * 100
                </div>
              </div>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {((performance.performancePercentage || 0) * 100).toFixed(2)}%
            </p>
            <p className="text-sm text-gray-500">
              {performance.performancePercentage >= 0.24
                ? "Above 24% threshold"
                : "Below 24% threshold"}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Floating Rate</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {((performance.floatingRate || 0) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Investments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            Floating Rate Investments
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Capital
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Transaction Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  End Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Hurdle Rate
                </th>
                {uniqueMonths.map((month) => (
                  <th
                    key={month}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {investments.map((investment) => (
                <tr key={investment.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {investment.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(investment.capital)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(investment.transDate, "dd MMMM yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(investment.endDate, "dd MMMM yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(investment.hurdleRate * 100).toFixed(2)}%
                  </td>
                  {uniqueMonths.map((month) => (
                    <td
                      key={month}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {investment.monthlyRates[month]
                        ? `${(investment.monthlyRates[month] * 100).toFixed(
                            2
                          )}%`
                        : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
