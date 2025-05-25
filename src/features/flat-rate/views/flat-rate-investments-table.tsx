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
              <span className="text-gray-600">Total Capital:</span>
              <span className="font-medium text-black">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(principleFixRate.totalCapital)}
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
                Capital
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
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {investment.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                  }).format(investment.capital)}
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
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(investment.monthlyRates)
                      .sort(([a], [b]) => {
                        const [monthA, yearA] = a.split(" ");
                        const [monthB, yearB] = b.split(" ");
                        if (yearA !== yearB)
                          return Number(yearA) - Number(yearB);
                        const months = [
                          "January",
                          "February",
                          "March",
                          "April",
                          "May",
                          "June",
                          "July",
                          "August",
                          "September",
                          "October",
                          "November",
                          "December",
                        ];
                        return months.indexOf(monthA) - months.indexOf(monthB);
                      })
                      .map(([monthYear, rate]) => (
                        <div key={monthYear} className="flex justify-between">
                          <span>{monthYear}:</span>
                          <span>{rate}%</span>
                        </div>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
