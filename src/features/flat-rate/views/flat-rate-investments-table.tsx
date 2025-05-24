"use client";

import React from "react";
import { getFlatRateInvestments } from "../actions/get-flat-rate-investments";
import { useEffect, useState } from "react";

export function FlatRateInvestmentsTable() {
  const [investments, setInvestments] = useState<
    Awaited<ReturnType<typeof getFlatRateInvestments>>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getFlatRateInvestments();
        setInvestments(data);
      } catch (error) {
        console.error("Error fetching investments:", error);
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
                      if (yearA !== yearB) return Number(yearA) - Number(yearB);
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
  );
}
