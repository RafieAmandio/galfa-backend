"use client";

import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth } from "date-fns";
import { TrendingUp, DollarSign, PieChart, Users } from "lucide-react";
import { getFixRatePrincipleByMonth } from "../../flat-rate/actions/get-fix-rate-principle-by-month";
import { getFixRateCoFByMonth } from "../../flat-rate/actions/get-fix-rate-cof-by-month";
import { getInflowByMonth } from "../../investments/actions/get-inflow-by-month"; // Note: Now handles all account types, not just fixed rate
import { getOutflowByMonth } from "../../investments/actions/get-outflow-by-month"; // Note: Handles all account types
import { getVCPerformanceByMonth } from "../../investments/actions/get-vc-performance-by-month";
import { getGrossProfitByMonth } from "../../investments/actions/get-gross-profit-by-month";
import { getInstallmentPrincipleByMonth } from "../../installment/actions/get-installment-principle-by-month";
import { getInstallmentCoFByMonth } from "../../installment/actions/get-installment-cof-by-month";
import { getFloatingRatePrincipleByMonth } from "../../floating-rate/actions/get-floating-rate-principle-by-month";
import { getFloatingRateAllocatedProfit } from "../../floating-rate/actions/get-floating-rate-allocated-profit";
import { getFloatingRateGrowthPercentage } from "../../floating-rate/actions/get-floating-rate-growth-percentage";

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

interface GrossProfitData {
  month: Date;
  currentMonthAUM: number;
  previousMonthAUM: number;
  totalInflow: number;
  totalOutflow: number;
  grossProfit: number;
  grossProfitPercentage: number;
  calculation: {
    formula: string;
    breakdown: string;
    percentageFormula: string;
    percentageBreakdown: string;
  };
  hasCurrentMonthData: boolean;
  hasPreviousMonthData: boolean;
}

interface InstallmentPrincipleData {
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
    monthlyCof: number;
    investmentType: "principle" | "interest_only";
    transactionDate: Date;
    endDate: Date | null;
  }>;
}

interface InstallmentCoFData {
  month: Date;
  totalGainedFunds: number;
  totalNetCapitalWorking: number;
  averageReturnPercentage: number;
  activeAccountsCount: number;
  accounts: Array<{
    id: number;
    accountNumber: string;
    investorEmail: string | null;
    netCapital: number;
    monthlyCof: number;
    investmentType: "principle" | "interest_only";
    presentValue: number;
    totalGainedFunds: number;
    returnPercentage: number;
    transactionDate: Date;
    endDate: Date | null;
  }>;
}

interface FloatingRatePrincipleData {
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
  }>;
}

interface FloatingRateAllocatedProfitData {
  month: Date;
  totalGrossProfit: number;
  fixRateCoF: number;
  installmentCoF: number;
  floatingRateAllocatedProfit: number;
  floatingRatePrinciple: number;
  performancePercentage: number;
  calculation: {
    formula: string;
    breakdown: string;
    performanceFormula: string;
    performanceBreakdown: string;
  };
  hasGrossProfitData: boolean;
  hasFixRateData: boolean;
  hasInstallmentData: boolean;
  hasPrincipleData: boolean;
}

interface FloatingRateGrowthData {
  month: Date;
  performancePercentage: number;
  growthPercentage: number;
  calculation: {
    rule: string;
    formula: string;
    breakdown: string;
  };
  hasPerformanceData: boolean;
}

export function AdminDashboard() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    startOfMonth(currentDate)
  );
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<string>(
    (currentDate.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    currentDate.getFullYear().toString()
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
  const [grossProfitData, setGrossProfitData] =
    useState<GrossProfitData | null>(null);
  const [grossProfitWarning, setGrossProfitWarning] = useState<string | null>(
    null
  );
  const [installmentPrincipleData, setInstallmentPrincipleData] =
    useState<InstallmentPrincipleData | null>(null);
  const [installmentCoFData, setInstallmentCoFData] =
    useState<InstallmentCoFData | null>(null);
  const [floatingRatePrincipleData, setFloatingRatePrincipleData] =
    useState<FloatingRatePrincipleData | null>(null);
  const [floatingRateAllocatedProfitData, setFloatingRateAllocatedProfitData] =
    useState<FloatingRateAllocatedProfitData | null>(null);
  const [floatingRateGrowthData, setFloatingRateGrowthData] =
    useState<FloatingRateGrowthData | null>(null);
  const [floatingRateWarning, setFloatingRateWarning] = useState<string | null>(
    null
  );
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
          grossProfitResult,
          installmentPrincipleResult,
          installmentCoFResult,
          floatingRatePrincipleResult,
          floatingRateAllocatedProfitResult,
          floatingRateGrowthResult,
        ] = await Promise.all([
          getFixRatePrincipleByMonth(selectedMonth),
          getFixRateCoFByMonth(selectedMonth),
          getInflowByMonth(selectedMonth),
          getOutflowByMonth(selectedMonth),
          getVCPerformanceByMonth(selectedMonth),
          getGrossProfitByMonth(selectedMonth),
          getInstallmentPrincipleByMonth(selectedMonth),
          getInstallmentCoFByMonth(selectedMonth),
          getFloatingRatePrincipleByMonth(selectedMonth),
          getFloatingRateAllocatedProfit(selectedMonth),
          getFloatingRateGrowthPercentage(selectedMonth),
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

        if (grossProfitResult.success) {
          setGrossProfitData(grossProfitResult.data || null);
          // Set warning if there are data availability issues
          if (grossProfitResult.message.includes("No AUM data found")) {
            setGrossProfitWarning(grossProfitResult.message);
          } else {
            setGrossProfitWarning(null);
          }
        } else {
          setError(grossProfitResult.message);
        }

        if (
          installmentPrincipleResult.success &&
          installmentPrincipleResult.data
        ) {
          setInstallmentPrincipleData(installmentPrincipleResult.data);
        } else {
          setInstallmentPrincipleData(null);
        }

        if (installmentCoFResult.success && installmentCoFResult.data) {
          setInstallmentCoFData(installmentCoFResult.data);
        } else {
          setInstallmentCoFData(null);
        }

        if (
          floatingRatePrincipleResult.success &&
          floatingRatePrincipleResult.data
        ) {
          setFloatingRatePrincipleData(floatingRatePrincipleResult.data);
        } else {
          setFloatingRatePrincipleData(null);
        }

        if (floatingRateAllocatedProfitResult.success) {
          setFloatingRateAllocatedProfitData(
            floatingRateAllocatedProfitResult.data || null
          );
          // Set warning if there are data availability issues
          if (floatingRateAllocatedProfitResult.message.includes("Warning:")) {
            setFloatingRateWarning(floatingRateAllocatedProfitResult.message);
          } else {
            setFloatingRateWarning(null);
          }
        } else {
          setFloatingRateAllocatedProfitData(null);
          setFloatingRateWarning(null);
        }

        if (floatingRateGrowthResult.success && floatingRateGrowthResult.data) {
          setFloatingRateGrowthData(floatingRateGrowthResult.data);
        } else {
          setFloatingRateGrowthData(null);
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

  // Handle month/year changes
  const handleMonthChange = (month: string) => {
    setSelectedMonthNumber(month);
    const newDate = new Date(parseInt(selectedYear), parseInt(month) - 1, 1);
    setSelectedMonth(startOfMonth(newDate));
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    const newDate = new Date(
      parseInt(year),
      parseInt(selectedMonthNumber) - 1,
      1
    );
    setSelectedMonth(startOfMonth(newDate));
  };

  // Generate year options (last 5 years to next 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = currentYear - 10; i <= currentYear + 10; i++) {
    yearOptions.push(i.toString());
  }

  // Month options
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

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
              Select a month and year to view detailed analytics
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Month Selector */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Month
              </label>
              <Select
                value={selectedMonthNumber}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selector */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Year
              </label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Date Display */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">
                Selected Period
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-md border text-sm font-medium text-gray-900">
                {format(selectedMonth, "MMMM yyyy")}
              </div>
            </div>
          </div>
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
                      New Inflow
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
                      Total Outflow
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

            {/* Gross Profit Warning */}
            {grossProfitWarning && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-orange-700 text-sm font-medium">
                      Gross Profit Calculation Notice
                    </p>
                    <p className="text-orange-600 text-sm mt-1">
                      {grossProfitWarning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Gross Profit Metric */}
            {grossProfitData && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Gross Profit
                      </h3>
                      <p className="text-sm text-gray-600">
                        {format(selectedMonth, "MMMM yyyy")} Portfolio Growth
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(grossProfitData.grossProfit)}
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        grossProfitData.grossProfit >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {grossProfitData.grossProfit >= 0 ? "↗ Profit" : "↘ Loss"}{" "}
                      ({formatPercentage(grossProfitData.grossProfitPercentage)}
                      )
                    </p>
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Gross Profit Formula:
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      {grossProfitData.calculation.formula}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Breakdown:
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      {grossProfitData.calculation.breakdown}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Percentage Formula:
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      {grossProfitData.calculation.percentageFormula}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Percentage Breakdown:
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      {grossProfitData.calculation.percentageBreakdown}
                    </p>
                  </div>
                </div>

                {/* Component Values */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">
                      Current AUM
                    </p>
                    <p className="text-sm font-bold text-blue-800">
                      {formatCurrency(grossProfitData.currentMonthAUM)}
                    </p>
                    {!grossProfitData.hasCurrentMonthData && (
                      <p className="text-xs text-red-500">No data</p>
                    )}
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium">
                      Previous AUM
                    </p>
                    <p className="text-sm font-bold text-purple-800">
                      {formatCurrency(grossProfitData.previousMonthAUM)}
                    </p>
                    {!grossProfitData.hasPreviousMonthData && (
                      <p className="text-xs text-red-500">No data</p>
                    )}
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Inflow</p>
                    <p className="text-sm font-bold text-green-800">
                      {formatCurrency(grossProfitData.totalInflow)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium">
                      Outflow
                    </p>
                    <p className="text-sm font-bold text-orange-800">
                      {formatCurrency(grossProfitData.totalOutflow)}
                    </p>
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

            {/* Installment Summary - Complete Section */}
            {installmentPrincipleData && installmentCoFData && (
              <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Installment Summary
                    </h2>
                    <p className="text-sm text-gray-600">
                      Monthly analytics for {format(selectedMonth, "MMMM yyyy")}{" "}
                      - Installment Investment Performance
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <PieChart className="h-5 w-5" />
                    <span>Installment Analytics</span>
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Total Net Capital */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">
                          Net Capital Working
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(
                            installmentPrincipleData.totalNetCapital
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Gained Funds */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">
                          Total Gained Funds
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(installmentCoFData.totalGainedFunds)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Average Monthly Return */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <PieChart className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">
                          Avg Monthly Return
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatPercentage(
                            installmentCoFData.averageReturnPercentage
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Active Accounts */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Users className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">
                          Active Accounts
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {installmentPrincipleData.activeAccountsCount}
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
                            {formatCurrency(
                              installmentPrincipleData.totalGrossCapital
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Admin Fees
                          </p>
                          <p className="font-medium text-orange-600">
                            {formatCurrency(
                              installmentPrincipleData.totalAdminFees
                            )}
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
                                Type
                              </th>
                              <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                                Net Capital
                              </th>
                            </tr>
                          </thead>
                          <tbody className="space-y-2">
                            {installmentPrincipleData.accounts
                              .slice(0, 5)
                              .map((account) => (
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
                                        {account.investorEmail}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="py-2 text-sm">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        account.investmentType === "principle"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-green-100 text-green-800"
                                      }`}
                                    >
                                      {account.investmentType === "principle"
                                        ? "Principal"
                                        : "Interest Only"}
                                    </span>
                                  </td>
                                  <td className="py-2 text-sm text-right font-medium">
                                    {formatCurrency(account.netCapital)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {installmentPrincipleData.accounts.length > 5 && (
                          <p className="text-sm text-gray-500 text-center mt-4">
                            ... and{" "}
                            {installmentPrincipleData.accounts.length - 5} more
                            accounts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CoF Data Table */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Total Gained Funds (CoF)
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">
                            Total Interest Earned
                          </p>
                          <p className="font-medium text-emerald-600">
                            {formatCurrency(
                              installmentCoFData.totalGainedFunds
                            )}
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
                                Monthly Rate
                              </th>
                              <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                                Interest Earned
                              </th>
                            </tr>
                          </thead>
                          <tbody className="space-y-2">
                            {installmentCoFData.accounts
                              .slice(0, 5)
                              .map((account) => (
                                <tr
                                  key={account.id}
                                  className="border-b border-gray-100"
                                >
                                  <td className="py-2 text-sm">
                                    <div>
                                      <p className="font-medium">
                                        {account.accountNumber}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="py-2 text-sm text-right">
                                    {formatPercentage(account.monthlyCof * 100)}
                                  </td>
                                  <td className="py-2 text-sm text-right font-medium text-emerald-600">
                                    {formatCurrency(account.totalGainedFunds)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {installmentCoFData.accounts.length > 5 && (
                          <p className="text-sm text-gray-500 text-center mt-4">
                            ... and {installmentCoFData.accounts.length - 5}{" "}
                            more accounts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Rate Summary - Complete Section */}
            {floatingRatePrincipleData &&
              floatingRateAllocatedProfitData &&
              floatingRateGrowthData && (
                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Floating Rate Summary
                      </h2>
                      <p className="text-sm text-gray-600">
                        Monthly analytics for{" "}
                        {format(selectedMonth, "MMMM yyyy")} - Floating Rate
                        Investment Performance
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <TrendingUp className="h-5 w-5" />
                      <span>Performance-Based Analytics</span>
                    </div>
                  </div>

                  {/* Warning Message */}
                  {floatingRateWarning && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-yellow-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            {floatingRateWarning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Net Capital */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-gray-600">
                            Total Net Capital
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(
                              floatingRatePrincipleData.totalNetCapital
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Allocated Profit */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-gray-600">
                            Allocated Profit
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(
                              floatingRateAllocatedProfitData.floatingRateAllocatedProfit
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Active Accounts */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-gray-600">
                            Active Accounts
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {floatingRatePrincipleData.activeAccountsCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Performance Percentage */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <PieChart className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-gray-600">
                            Performance Rate
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatPercentage(
                              floatingRateAllocatedProfitData.performancePercentage
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Growth Percentage */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xs font-medium text-gray-600">
                            Investor Growth Rate
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatPercentage(
                              floatingRateGrowthData.growthPercentage
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Principle Data */}
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
                              {formatCurrency(
                                floatingRatePrincipleData.totalGrossCapital
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Total Admin Fees
                            </p>
                            <p className="font-medium text-orange-600">
                              {formatCurrency(
                                floatingRatePrincipleData.totalAdminFees
                              )}
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
                              {floatingRatePrincipleData.accounts
                                .slice(0, 5)
                                .map((account) => (
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
                                          {format(
                                            account.transactionDate,
                                            "MMM dd, yyyy"
                                          )}
                                        </p>
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
                          {floatingRatePrincipleData.accounts.length > 5 && (
                            <p className="text-sm text-gray-500 text-center mt-4">
                              ... and{" "}
                              {floatingRatePrincipleData.accounts.length - 5}{" "}
                              more accounts
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Allocated Profit Calculation */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Profit Allocation Calculation
                      </h3>
                      <div className="space-y-4">
                        {/* Formula */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Formula:
                          </p>
                          <p className="text-sm text-gray-600">
                            {
                              floatingRateAllocatedProfitData.calculation
                                .formula
                            }
                          </p>
                        </div>

                        {/* Breakdown */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Profit Calculation:
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {
                              floatingRateAllocatedProfitData.calculation
                                .breakdown
                            }
                          </p>
                        </div>

                        {/* Performance Calculation */}
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Performance Formula:
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {
                              floatingRateAllocatedProfitData.calculation
                                .performanceFormula
                            }
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {
                              floatingRateAllocatedProfitData.calculation
                                .performanceBreakdown
                            }
                          </p>
                        </div>

                        {/* Component Breakdown */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              Total Gross Profit
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(
                                floatingRateAllocatedProfitData.totalGrossProfit
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              - Fixed Rate CoF
                            </span>
                            <span className="text-sm font-medium text-red-600">
                              {formatCurrency(
                                floatingRateAllocatedProfitData.fixRateCoF
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              - Installment CoF
                            </span>
                            <span className="text-sm font-medium text-red-600">
                              {formatCurrency(
                                floatingRateAllocatedProfitData.installmentCoF
                              )}
                            </span>
                          </div>
                          <div className="border-t pt-2 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                Floating Rate Allocated Profit
                              </span>
                              <span className="text-sm font-bold text-green-600">
                                {formatCurrency(
                                  floatingRateAllocatedProfitData.floatingRateAllocatedProfit
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                Performance Percentage
                              </span>
                              <span className="text-sm font-bold text-yellow-600">
                                {formatPercentage(
                                  floatingRateAllocatedProfitData.performancePercentage
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Growth Rate Calculation */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Investor Growth Rate Calculation
                      </h3>
                      <div className="space-y-4">
                        {/* Business Rule */}
                        <div className="p-4 bg-indigo-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Applied Rule:
                          </p>
                          <p className="text-sm text-gray-600">
                            {floatingRateGrowthData.calculation.rule}
                          </p>
                        </div>

                        {/* Formula */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Formula:
                          </p>
                          <p className="text-sm text-gray-600">
                            {floatingRateGrowthData.calculation.formula}
                          </p>
                        </div>

                        {/* Calculation Breakdown */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            Calculation:
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {floatingRateGrowthData.calculation.breakdown}
                          </p>
                        </div>

                        {/* Business Rules Explanation */}
                        <div className="space-y-3">
                          <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400">
                            <p className="text-sm font-medium text-yellow-800">
                              Business Rules:
                            </p>
                            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                              <li>
                                • If performance &lt; 24%: Growth = Performance
                                ÷ 12
                              </li>
                              <li>
                                • If performance ≥ 24%: Growth = 1.42% (fixed)
                              </li>
                            </ul>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium text-gray-900">
                              Current Performance
                            </span>
                            <span className="text-sm font-medium">
                              {formatPercentage(
                                floatingRateGrowthData.performancePercentage
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-900">
                              Investor Growth Rate
                            </span>
                            <span className="text-sm font-bold text-indigo-600">
                              {formatPercentage(
                                floatingRateGrowthData.growthPercentage
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </>
        )}
    </div>
  );
}
