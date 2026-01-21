"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Users,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  AlertTriangle,
  Calendar,
  BarChart3,
  Percent,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFloatingRatePrincipleByMonthQueryOptions } from "@/features/floating-rate/actions/get-floating-rate-principle-by-month/query-options";
import { getFloatingRateAllocatedProfitQueryOptions } from "@/features/floating-rate/actions/get-floating-rate-allocated-profit/query-options";
import { getFloatingRateGrowthPercentageQueryOptions } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/query-options";
import { getFixRatePrincipleByMonthQueryOptions } from "@/features/flat-rate/actions/get-fix-rate-principle-by-month/query-options";
import { getFixRateCoFByMonthQueryOptions } from "@/features/flat-rate/actions/get-fix-rate-cof-by-month/query-options";
import { getInflowByMonthQueryOptions } from "@/features/investments/actions/get-inflow-by-month/query-options";
import { getOutflowByMonthQueryOptions } from "@/features/investments/actions/get-outflow-by-month/query-options";
import { getVCPerformanceByMonthQueryOptions } from "@/features/investments/actions/get-vc-performance-by-month/query-options";
import { getGrossProfitByMonthQueryOptions } from "@/features/investments/actions/get-gross-profit-by-month/query-options";
import { getInstallmentPrincipleByMonthQueryOptions } from "@/features/installment/actions/get-installment-principle-by-month/query-options";
import { getInstallmentCoFByMonthQueryOptions } from "@/features/installment/actions/get-installment-cof-by-month/query-options";

interface AdminDashboardViewProps {
  user: any;
  dashboardData: {
    selectedMonth: Date;
    warnings: {
      vcPerformanceWarning: string | null;
      grossProfitWarning: string | null;
      floatingRateWarning: string | null;
    };
  } | null;
  error?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (value: number) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

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

export function AdminDashboardView({
  user,
  dashboardData,
  error,
}: AdminDashboardViewProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<Date>(
    dashboardData?.selectedMonth || startOfMonth(currentDate)
  );
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<string>(
    dashboardData?.selectedMonth
      ? (dashboardData.selectedMonth.getMonth() + 1).toString()
      : (currentDate.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    dashboardData?.selectedMonth
      ? dashboardData.selectedMonth.getFullYear().toString()
      : currentDate.getFullYear().toString()
  );

  // Fetch all dashboard data using Tanstack React Query
  const { data: principleResult, isLoading: isPrincipleLoading } = useQuery(
    getFixRatePrincipleByMonthQueryOptions(selectedMonth)
  );
  const { data: cofResult, isLoading: isCoFLoading } = useQuery(
    getFixRateCoFByMonthQueryOptions(selectedMonth)
  );
  const { data: inflowResult, isLoading: isInflowLoading } = useQuery(
    getInflowByMonthQueryOptions(selectedMonth)
  );
  const { data: outflowResult, isLoading: isOutflowLoading } = useQuery(
    getOutflowByMonthQueryOptions(selectedMonth)
  );
  const { data: vcPerformanceResult, isLoading: isVCPerformanceLoading } =
    useQuery(getVCPerformanceByMonthQueryOptions(selectedMonth));
  const { data: grossProfitResult, isLoading: isGrossProfitLoading } = useQuery(
    getGrossProfitByMonthQueryOptions(selectedMonth)
  );
  const {
    data: installmentPrincipleResult,
    isLoading: isInstallmentPrincipleLoading,
  } = useQuery(getInstallmentPrincipleByMonthQueryOptions(selectedMonth));
  const { data: installmentCoFResult, isLoading: isInstallmentCoFLoading } =
    useQuery(getInstallmentCoFByMonthQueryOptions(selectedMonth));
  const {
    data: floatingRatePrincipleResult,
    isLoading: isFloatingRatePrincipleLoading,
  } = useQuery(getFloatingRatePrincipleByMonthQueryOptions(selectedMonth));
  const {
    data: floatingRateAllocatedProfitResult,
    isLoading: isFloatingRateAllocatedProfitLoading,
  } = useQuery(getFloatingRateAllocatedProfitQueryOptions(selectedMonth));
  const {
    data: floatingRateGrowthResult,
    isLoading: isFloatingRateGrowthLoading,
  } = useQuery(getFloatingRateGrowthPercentageQueryOptions(selectedMonth));

  // Extract all data
  const principleData = principleResult?.data || null;
  const cofData = cofResult?.data || null;
  const inflowData = inflowResult?.data || null;
  const outflowData = outflowResult?.data || null;
  const vcPerformanceData = vcPerformanceResult?.data || null;
  const grossProfitData = grossProfitResult?.data || null;
  const installmentPrincipleData = installmentPrincipleResult?.data || null;
  const installmentCoFData = installmentCoFResult?.data || null;
  const floatingRatePrincipleData = floatingRatePrincipleResult?.data || null;
  const floatingRateAllocatedProfitData =
    floatingRateAllocatedProfitResult?.data || null;
  const floatingRateGrowthData = floatingRateGrowthResult?.data || null;

  const isLoading =
    isPrincipleLoading ||
    isCoFLoading ||
    isInflowLoading ||
    isOutflowLoading ||
    isVCPerformanceLoading ||
    isGrossProfitLoading ||
    isInstallmentPrincipleLoading ||
    isInstallmentCoFLoading ||
    isFloatingRatePrincipleLoading ||
    isFloatingRateAllocatedProfitLoading ||
    isFloatingRateGrowthLoading;

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

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) =>
    (currentYear - 10 + i).toString()
  );

  const warnings = dashboardData?.warnings;

  // Calculate totals
  const totalNetCapital =
    (principleData?.totalNetCapital || 0) +
    (installmentPrincipleData?.totalNetCapital || 0) +
    (floatingRatePrincipleData?.totalNetCapital || 0);

  const totalActiveAccounts =
    (principleData?.activeAccountsCount || 0) +
    (installmentPrincipleData?.activeAccountsCount || 0) +
    (floatingRatePrincipleData?.activeAccountsCount || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Admin Dashboard
              </h1>
              <p className="text-slate-600">
                Monthly analytics and performance overview
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
                <Select
                  value={selectedMonthNumber}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-[130px] border-0 shadow-none">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[90px] border-0 shadow-none">
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
              <Badge variant="secondary" className="px-3 py-2">
                <Calendar className="h-4 w-4 mr-2" />
                {format(selectedMonth, "MMMM yyyy")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 bg-white rounded-lg border px-6 py-4">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-slate-600">Loading dashboard data...</span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {!isLoading && warnings && (
          <div className="space-y-2 mb-6">
            {warnings.vcPerformanceWarning && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  {warnings.vcPerformanceWarning}
                </p>
              </div>
            )}
            {warnings.grossProfitWarning && (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <p className="text-sm text-orange-800">
                  {warnings.grossProfitWarning}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main KPIs */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Net Capital */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Net Capital
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(totalNetCapital)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gross Profit */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Gross Profit
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        (grossProfitData?.grossProfit || 0) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(grossProfitData?.grossProfit || 0)}
                    </p>
                    <p
                      className={`text-sm ${
                        (grossProfitData?.grossProfit || 0) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatPercentage(
                        grossProfitData?.grossProfitPercentage || 0
                      )}
                    </p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      (grossProfitData?.grossProfit || 0) >= 0
                        ? "bg-emerald-50"
                        : "bg-red-50"
                    }`}
                  >
                    {(grossProfitData?.grossProfit || 0) >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AUM */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Assets Under Management
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(vcPerformanceData?.latestAUM || 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                    <PieChart className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Accounts */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Active Accounts
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {totalActiveAccounts}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cash Flow */}
        {!isLoading && inflowData && outflowData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Inflow
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {formatCurrency(inflowData.totalNetInflowFunds)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {inflowData.newAccountsCount} new accounts
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <ArrowUpRight className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Outflow
                    </p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {formatCurrency(outflowData.totalOutflow)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {outflowData.outflowCount} transactions
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                    <ArrowDownRight className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Investment Type Tabs */}
        {!isLoading && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fixed-rate">Fixed Rate</TabsTrigger>
              <TabsTrigger value="floating-rate">Floating Rate</TabsTrigger>
              <TabsTrigger value="installment">Installment</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fixed Rate Card */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Percent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Fixed Rate</CardTitle>
                        <CardDescription>
                          {principleData?.activeAccountsCount || 0} accounts
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Net Capital</span>
                      <span className="font-medium">
                        {formatCurrency(principleData?.totalNetCapital || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Gain (CoF)</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(cofData?.totalGainFund || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Avg Return</span>
                      <span className="font-medium">
                        {formatPercentage(cofData?.averageReturnPercentage || 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Floating Rate Card */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Floating Rate
                        </CardTitle>
                        <CardDescription>
                          {floatingRatePrincipleData?.activeAccountsCount || 0}{" "}
                          accounts
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Net Capital</span>
                      <span className="font-medium">
                        {formatCurrency(
                          floatingRatePrincipleData?.totalNetCapital || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Allocated Profit</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(
                          floatingRateAllocatedProfitData?.floatingRateAllocatedProfit ||
                            0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Growth</span>
                      <span className="font-medium">
                        {formatPercentage(
                          floatingRateGrowthData?.growthPercentage || 0
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Installment Card */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Installment</CardTitle>
                        <CardDescription>
                          {installmentPrincipleData?.activeAccountsCount || 0}{" "}
                          accounts
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Net Capital</span>
                      <span className="font-medium">
                        {formatCurrency(
                          installmentPrincipleData?.totalNetCapital || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Gained Funds</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(
                          installmentCoFData?.totalGainedFunds || 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Avg Return</span>
                      <span className="font-medium">
                        {formatPercentage(
                          installmentCoFData?.averageReturnPercentage || 0
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gross Profit Breakdown */}
              {grossProfitData && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Gross Profit Breakdown
                    </CardTitle>
                    <CardDescription>
                      {format(selectedMonth, "MMMM yyyy")} portfolio performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium mb-1">
                          Current AUM
                        </p>
                        <p className="text-sm font-bold text-blue-800">
                          {formatCurrency(grossProfitData.currentMonthAUM)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600 font-medium mb-1">
                          Previous AUM
                        </p>
                        <p className="text-sm font-bold text-purple-800">
                          {formatCurrency(grossProfitData.previousMonthAUM)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-600 font-medium mb-1">
                          Total Inflow
                        </p>
                        <p className="text-sm font-bold text-emerald-800">
                          {formatCurrency(grossProfitData.totalInflow)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600 font-medium mb-1">
                          Total Outflow
                        </p>
                        <p className="text-sm font-bold text-red-800">
                          {formatCurrency(grossProfitData.totalOutflow)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 font-medium mb-1">
                        Formula
                      </p>
                      <p className="text-sm text-slate-700">
                        {grossProfitData.calculation.formula}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Fixed Rate Tab */}
            <TabsContent value="fixed-rate" className="space-y-6">
              {principleData && cofData && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Gross Capital</p>
                        <p className="text-xl font-bold mt-1">
                          {formatCurrency(principleData.totalGrossCapital)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Admin Fees</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">
                          {formatCurrency(principleData.totalAdminFees)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Net Capital</p>
                        <p className="text-xl font-bold mt-1">
                          {formatCurrency(principleData.totalNetCapital)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Total Gain</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">
                          {formatCurrency(cofData.totalGainFund)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Accounts Table */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Active Accounts</CardTitle>
                      <CardDescription>
                        {principleData.activeAccountsCount} fixed rate accounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Account
                              </th>
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Investor
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Net Capital
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Rate
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Gain
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {principleData.accounts
                              .slice(0, 10)
                              .map((account: any, index: number) => {
                                const cofAccount = cofData.accounts.find(
                                  (c: any) =>
                                    c.accountNumber === account.accountNumber
                                );
                                return (
                                  <tr
                                    key={account.id}
                                    className="border-b border-slate-100"
                                  >
                                    <td className="py-3">
                                      <div>
                                        <p className="font-medium text-sm">
                                          {account.accountNumber}
                                        </p>
                                        {account.isRollover && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            Rollover
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 text-sm text-slate-600">
                                      {account.investorEmail || "-"}
                                    </td>
                                    <td className="py-3 text-sm text-right font-medium">
                                      {formatCurrency(account.netCapital)}
                                    </td>
                                    <td className="py-3 text-sm text-right">
                                      {cofAccount
                                        ? `${(cofAccount.annualRate * 100).toFixed(1)}%`
                                        : "-"}
                                    </td>
                                    <td className="py-3 text-sm text-right font-medium text-emerald-600">
                                      {cofAccount
                                        ? formatCurrency(cofAccount.totalGain)
                                        : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                        {principleData.accounts.length > 10 && (
                          <p className="text-sm text-slate-500 text-center py-4">
                            Showing 10 of {principleData.accounts.length}{" "}
                            accounts
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Floating Rate Tab */}
            <TabsContent value="floating-rate" className="space-y-6">
              {floatingRatePrincipleData && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Gross Capital</p>
                        <p className="text-xl font-bold mt-1">
                          {formatCurrency(
                            floatingRatePrincipleData.totalGrossCapital
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Admin Fees</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">
                          {formatCurrency(
                            floatingRatePrincipleData.totalAdminFees
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Net Capital</p>
                        <p className="text-xl font-bold mt-1">
                          {formatCurrency(
                            floatingRatePrincipleData.totalNetCapital
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">
                          Allocated Profit
                        </p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">
                          {formatCurrency(
                            floatingRateAllocatedProfitData?.floatingRateAllocatedProfit ||
                              0
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Growth Performance */}
                  {floatingRateGrowthData && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle>Growth Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 font-medium mb-1">
                              Performance %
                            </p>
                            <p className="text-lg font-bold">
                              {formatPercentage(
                                floatingRateGrowthData.performancePercentage
                              )}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-emerald-50 rounded-lg">
                            <p className="text-xs text-emerald-600 font-medium mb-1">
                              Growth %
                            </p>
                            <p className="text-lg font-bold text-emerald-700">
                              {formatPercentage(
                                floatingRateGrowthData.growthPercentage
                              )}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium mb-1">
                              Calculation Rule
                            </p>
                            <p className="text-sm text-blue-700">
                              {floatingRateGrowthData.calculation.rule}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Accounts Table */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Active Accounts</CardTitle>
                      <CardDescription>
                        {floatingRatePrincipleData.activeAccountsCount} floating
                        rate accounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Account
                              </th>
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Investor
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Net Capital
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {floatingRatePrincipleData.accounts
                              .slice(0, 10)
                              .map((account: any) => (
                                <tr
                                  key={account.id}
                                  className="border-b border-slate-100"
                                >
                                  <td className="py-3">
                                    <p className="font-medium text-sm">
                                      {account.accountNumber}
                                    </p>
                                  </td>
                                  <td className="py-3 text-sm text-slate-600">
                                    {account.investorEmail || "-"}
                                  </td>
                                  <td className="py-3 text-sm text-right font-medium">
                                    {formatCurrency(account.netCapital)}
                                  </td>
                                  <td className="py-3 text-sm text-right text-slate-500">
                                    {format(
                                      new Date(account.transactionDate),
                                      "dd MMM yyyy"
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {floatingRatePrincipleData.accounts.length > 10 && (
                          <p className="text-sm text-slate-500 text-center py-4">
                            Showing 10 of{" "}
                            {floatingRatePrincipleData.accounts.length} accounts
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Installment Tab */}
            <TabsContent value="installment" className="space-y-6">
              {installmentPrincipleData && installmentCoFData && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Gross Capital</p>
                        <p className="text-xl font-bold mt-1">
                          {formatCurrency(
                            installmentPrincipleData.totalGrossCapital
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Admin Fees</p>
                        <p className="text-xl font-bold text-amber-600 mt-1">
                          {formatCurrency(
                            installmentPrincipleData.totalAdminFees
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Net Capital</p>
                        <p className="text-xl font-bold mt-1">
                          {formatCurrency(
                            installmentPrincipleData.totalNetCapital
                          )}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">Gained Funds</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">
                          {formatCurrency(installmentCoFData.totalGainedFunds)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Accounts Table */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>Active Accounts</CardTitle>
                      <CardDescription>
                        {installmentPrincipleData.activeAccountsCount}{" "}
                        installment accounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Account
                              </th>
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Investor
                              </th>
                              <th className="text-left text-xs font-medium text-slate-500 uppercase py-3">
                                Type
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Net Capital
                              </th>
                              <th className="text-right text-xs font-medium text-slate-500 uppercase py-3">
                                Monthly CoF
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {installmentPrincipleData.accounts
                              .slice(0, 10)
                              .map((account: any) => (
                                <tr
                                  key={account.id}
                                  className="border-b border-slate-100"
                                >
                                  <td className="py-3">
                                    <p className="font-medium text-sm">
                                      {account.accountNumber}
                                    </p>
                                  </td>
                                  <td className="py-3 text-sm text-slate-600">
                                    {account.investorEmail || "-"}
                                  </td>
                                  <td className="py-3">
                                    <Badge
                                      variant={
                                        account.investmentType === "principle"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {account.investmentType === "principle"
                                        ? "Principle"
                                        : "Interest Only"}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-sm text-right font-medium">
                                    {formatCurrency(account.netCapital)}
                                  </td>
                                  <td className="py-3 text-sm text-right text-emerald-600">
                                    {formatCurrency(account.monthlyCof)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        {installmentPrincipleData.accounts.length > 10 && (
                          <p className="text-sm text-slate-500 text-center py-4">
                            Showing 10 of{" "}
                            {installmentPrincipleData.accounts.length} accounts
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
