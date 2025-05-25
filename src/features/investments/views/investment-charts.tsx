"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  getFlatRateInvestments,
  FlatRateInvestment,
} from "@/features/flat-rate/actions/get-flat-rate-investments";
import {
  getInstallmentInvestments,
  InstallmentInvestment,
} from "@/features/installment/actions/get-installments";

interface ChartDataPoint {
  name: string;
  month: string;
  rate?: number;
  principle?: number;
  cof?: number;
  total?: number;
  balance?: number;
}

// Custom tooltip component for better contrast
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function InvestmentCharts() {
  const [flatRateInvestments, setFlatRateInvestments] = useState<
    FlatRateInvestment[]
  >([]);
  const [installmentInvestments, setInstallmentInvestments] = useState<
    InstallmentInvestment[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [flatRateData, installmentData] = await Promise.all([
          getFlatRateInvestments(),
          getInstallmentInvestments(),
        ]);
        setFlatRateInvestments(flatRateData);
        setInstallmentInvestments(installmentData);
      } catch (error) {
        console.error("Error fetching investment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Prepare data for fix rate monthly rates chart
  const fixRateMonthlyData: ChartDataPoint[] = flatRateInvestments.flatMap(
    (investment) =>
      Object.entries(investment.monthlyRates).map(([month, rate]) => ({
        name: investment.name,
        month,
        rate: rate * 100, // Convert to percentage
      }))
  );

  // Prepare data for installment payments chart
  const installmentPaymentData: ChartDataPoint[] =
    installmentInvestments.flatMap((investment) =>
      Object.entries(investment.monthlyPayments).map(([month, total]) => ({
        name: investment.name,
        month,
        principle: investment.monthlyPrinciple,
        cof: investment.monthlyCoF,
        total,
      }))
    );

  return (
    <div className="space-y-8">
      {/* Fix Rate Monthly Rates Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Fix Rate Monthly Rates
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fixRateMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value: number) => `${value}%`}
                domain={[0, "auto"]}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                  />
                }
              />
              <Legend />
              <Bar dataKey="rate" name="Monthly Rate" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Installment Payments Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Installment Monthly Payments
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={installmentPaymentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    notation: "compact",
                  }).format(value)
                }
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(value)
                    }
                  />
                }
              />
              <Legend />
              <Bar
                dataKey="principle"
                name="Principle"
                fill="#82ca9d"
                stackId="a"
              />
              <Bar dataKey="cof" name="CoF" fill="#8884d8" stackId="a" />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Payment"
                stroke="#ff7300"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Installment Balance Over Time Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Installment Balance Over Time
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={installmentInvestments.flatMap((investment) => {
                const balanceData: ChartDataPoint[] = [];
                let remainingBalance = investment.capital;
                const monthlyPrinciple = investment.monthlyPrinciple;

                Object.keys(investment.monthlyPayments).forEach((month) => {
                  remainingBalance -= monthlyPrinciple;
                  balanceData.push({
                    name: investment.name,
                    month,
                    balance: remainingBalance,
                  });
                });

                return balanceData;
              })}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    notation: "compact",
                  }).format(value)
                }
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(value)
                    }
                  />
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                name="Remaining Balance"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
