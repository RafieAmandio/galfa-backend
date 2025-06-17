"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, startOfMonth } from "date-fns";
import {
  CalendarIcon,
  TrendingUp,
  DollarSign,
  PieChart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFixRatePrincipleByMonth } from "../../flat-rate/actions/get-fix-rate-principle-by-month";
import { getFixRateCoFByMonth } from "../../flat-rate/actions/get-fix-rate-cof-by-month";
import { getInflowByMonth } from "../../investments/actions/get-inflow-by-month"; // Note: Now handles all account types, not just fixed rate
import { getOutflowByMonth } from "../../investments/actions/get-outflow-by-month"; // Note: Handles all account types
import { getVCPerformanceByMonth } from "../../floating-rate/actions/get-vc-performance-by-month";

interface PrincipleData {
  month: Date;
  totalGrossCapital: number;
  totalAdminFees: number;
  totalNetCapital: number;
  activeAccountsCount: number;
  accounts: Array<{
    id: number;
    accountNumber: string;
    investorEmail: string | null;
    grossCapital: number;
    adminFee: number;
    netCapital: number;
    transactionDate: Date;
    isRollover: boolean | null;
  }>;
}

interface CoFData {
  month: Date;
  totalGainFund: number;
  totalNetCapitalWorking: number;
  totalPresentValue: number;
  averageReturnPercentage: number;
  activeAccountsCount: number;
  accounts: Array<{
    id: number;
    accountNumber: string;
    investorEmail: string | null;
    netCapital: number;
    annualRate: number;
    presentValue: number;
    totalGain: number;
    returnPercentage: number;
    transactionDate: Date;
    endDate: Date | null;
  }>;
}

interface InflowData {
  month: Date;
  totalNewInvestments: number;
  totalAdminFeesCollected: number;
  totalNetInflowFunds: number;
  newAccountsCount: number;
  newInvestments: Array<{
    id: number;
    accountNumber: string;
    accountType: "fixed_rate" | "floating_rate" | "installment";
    investorEmail: string | null;
    investorName: string | null;
    grossCapital: number;
    adminFee: number;
    netCapital: number;
    rate: number; // Annual rate for fixed/floating, monthly CoF for installment
    rateType: string; // Description of rate type
    transactionDate: Date;
    endDate: Date | null;
  }>;
}

interface OutflowData {
  month: Date;
  totalOutflow: number;
  fixRateOutflow: number;
  floatingRateOutflow: number;
  installmentOutflow: number;
  outflowCount: number;
  outflowTransactions: Array<{
    id: number;
    accountId: number;
    accountNumber: string;
    accountType: "fixed_rate" | "floating_rate" | "installment";
    investorEmail: string | null;
    investorName: string | null;
    amount: number;
    transactionDate: Date;
    description: string | null;
    redemptionType: "partial" | "full" | "scheduled";
    isRollover: boolean | null;
  }>;
}

interface VCPerformanceData {
  month: Date;
  totalAUM: number;
  totalProfitTaken: number;
  averageAUM: number;
  averageProfitTaken: number;
  dataPointsCount: number;
  latestAUM: number;
  latestProfitTaken: number;
  latestDate: Date | null;
}

export function AdminDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    startOfMonth(new Date())
  );
  const [principleData, setPrincipleData] = useState<PrincipleData | null>(
    null
  );
  const [cofData, setCoFData] = useState<CoFData | null>(null);
  const [inflowData, setInflowData] = useState<InflowData | null>(null);
  const [outflowData, setOutflowData] = useState<OutflowData | null>(null);
  const [vcPerformanceData, setVcPerformanceData] =
    useState<VCPerformanceData | null>(null);
  const [vcPerformanceWarning, setVcPerformanceWarning] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data when month changes
  useEffect(() => {
    const loadMonthlyData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          principleResult,
          cofResult,
          inflowResult,
          outflowResult,
          vcPerformanceResult,
        ] = await Promise.all([
          getFixRatePrincipleByMonth(selectedMonth),
          getFixRateCoFByMonth(selectedMonth),
          getInflowByMonth(selectedMonth),
          getOutflowByMonth(selectedMonth),
          getVCPerformanceByMonth(selectedMonth),
        ]);

        if (principleResult.success && principleResult.data) {
          setPrincipleData(principleResult.data);
        } else {
          setError(principleResult.message);
        }

        if (cofResult.success && cofResult.data) {
          setCoFData(cofResult.data);
        } else {
          setError(cofResult.message);
        }

        if (inflowResult.success && inflowResult.data) {
          setInflowData(inflowResult.data);
        } else {
          setError(inflowResult.message);
        }

        if (outflowResult.success && outflowResult.data) {
          setOutflowData(outflowResult.data);
        } else {
          setError(outflowResult.message);
        }

        if (vcPerformanceResult.success) {
          setVcPerformanceData(vcPerformanceResult.data || null);
          // Set warning if there's a message but no error
          if (vcPerformanceResult.message && !vcPerformanceResult.data) {
            setVcPerformanceWarning(vcPerformanceResult.message);
          } else if (vcPerformanceResult.message.includes("Warning:")) {
            setVcPerformanceWarning(vcPerformanceResult.message);
          } else {
            setVcPerformanceWarning(null);
          }
        } else {
          setError(vcPerformanceResult.message);
        }
      } catch (err) {
        console.error("Error loading monthly data:", err);
        setError("Failed to load monthly data");
      } finally {
        setLoading(false);
      }
    };

    loadMonthlyData();
  }, [selectedMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Month Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Monthly Analytics
            </h2>
            <p className="text-sm text-gray-600">
              Select a month to view detailed analytics
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !selectedMonth && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedMonth ? (
                  format(selectedMonth, "MMMM yyyy")
                ) : (
                  <span>Pick a month</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={(date) => {
                  if (date) {
                    setSelectedMonth(startOfMonth(date));
                  }
                }}
                initialFocus
                captionLayout="dropdown"
                fromYear={2020}
                toYear={2030}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading monthly data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading &&
        !error &&
        principleData &&
        cofData &&
        inflowData &&
        outflowData && (
          <>
            {/* Cash Flow Metrics - Inflow & Outflow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* New Inflow Metric */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      New Inflow (All Types)
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(inflowData.totalNetInflowFunds)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {inflowData.newAccountsCount} new accounts •{" "}
                      {formatCurrency(inflowData.totalAdminFeesCollected)} admin
                      fees
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Outflow Metric */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-red-600 rotate-180" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Outflow (All Types)
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(outflowData.totalOutflow)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {outflowData.outflowCount} transactions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* VC Performance Warning */}
            {vcPerformanceWarning && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Users className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-yellow-700 text-sm font-medium">
                      VC Performance Notice
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      {vcPerformanceWarning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* VC Performance Metrics - AUM & Profit Taken */}
            {vcPerformanceData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Assets Under Management */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <PieChart className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Assets Under Management
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(vcPerformanceData.latestAUM)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(selectedMonth, "MMMM yyyy")} •{" "}
                        {vcPerformanceData.dataPointsCount > 1
                          ? `${vcPerformanceData.dataPointsCount} records (warning)`
                          : "1 record"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profit Taken */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Profit Taken
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(vcPerformanceData.latestProfitTaken)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(selectedMonth, "MMMM yyyy")} •{" "}
                        {vcPerformanceData.latestDate
                          ? format(vcPerformanceData.latestDate, "MMM dd")
                          : "No date"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fix Rate Summary - Complete Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Fix Rate Summary
                  </h2>
                  <p className="text-sm text-gray-600">
                    Monthly analytics for {format(selectedMonth, "MMMM yyyy")} -
                    Fixed Rate Investment Performance
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <PieChart className="h-5 w-5" />
                  <span>Analytics Dashboard</span>
                </div>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Net Capital */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-600">
                        Net Capital Working
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(principleData.totalNetCapital)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Gain Fund (CoF) */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-600">
                        Total Gain (CoF)
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(cofData.totalGainFund)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Average Monthly Return */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PieChart className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-600">
                        Avg Monthly Return
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatPercentage(cofData.averageReturnPercentage)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Accounts */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Users className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-600">
                        Active Accounts
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {principleData.activeAccountsCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Principle Data Table */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Net Investor Funds (Principle)
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Gross Capital
                        </p>
                        <p className="font-medium">
                          {formatCurrency(principleData.totalGrossCapital)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Admin Fees
                        </p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(principleData.totalAdminFees)}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                              Account
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                              Investor
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                              Net Capital
                            </th>
                          </tr>
                        </thead>
                        <tbody className="space-y-2">
                          {principleData.accounts.slice(0, 5).map((account) => (
                            <tr
                              key={account.id}
                              className="border-b border-gray-100"
                            >
                              <td className="py-2 text-sm">
                                <div>
                                  <p className="font-medium">
                                    {account.accountNumber}
                                  </p>
                                  {account.isRollover && (
                                    <span className="text-xs text-blue-600">
                                      Rollover
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 text-sm text-gray-600">
                                {account.investorEmail}
                              </td>
                              <td className="py-2 text-sm text-right font-medium">
                                {formatCurrency(account.netCapital)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {principleData.accounts.length > 5 && (
                        <p className="text-sm text-gray-500 text-center mt-4">
                          ... and {principleData.accounts.length - 5} more
                          accounts
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CoF Data Table */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Total Gain Fund (CoF)
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Capital Working
                        </p>
                        <p className="font-medium">
                          {formatCurrency(cofData.totalNetCapitalWorking)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Interest Paid
                        </p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(cofData.totalGainFund)}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                              Account
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                              Rate
                            </th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                              Total Gain
                            </th>
                          </tr>
                        </thead>
                        <tbody className="space-y-2">
                          {cofData.accounts.slice(0, 5).map((account) => (
                            <tr
                              key={account.id}
                              className="border-b border-gray-100"
                            >
                              <td className="py-2 text-sm">
                                <div>
                                  <p className="font-medium">
                                    {account.accountNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Return:{" "}
                                    {formatPercentage(account.returnPercentage)}
                                  </p>
                                </div>
                              </td>
                              <td className="py-2 text-sm text-right">
                                {formatPercentage(account.annualRate * 100)}
                              </td>
                              <td className="py-2 text-sm text-right font-medium text-green-600">
                                {formatCurrency(account.totalGain)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {cofData.accounts.length > 5 && (
                        <p className="text-sm text-gray-500 text-center mt-4">
                          ... and {cofData.accounts.length - 5} more accounts
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
