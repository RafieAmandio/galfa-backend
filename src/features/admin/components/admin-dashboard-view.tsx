"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  AlertTriangle,
  Percent,
  BarChart3,
} from "lucide-react";
import { DashboardSkeleton } from "./dashboard-skeleton";
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

  // Fetch all dashboard data
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

  const totalNetCapital =
    (principleData?.totalNetCapital || 0) +
    (installmentPrincipleData?.totalNetCapital || 0) +
    (floatingRatePrincipleData?.totalNetCapital || 0);

  const totalActiveAccounts =
    (principleData?.activeAccountsCount || 0) +
    (installmentPrincipleData?.activeAccountsCount || 0) +
    (floatingRatePrincipleData?.activeAccountsCount || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monthly overview</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedMonthNumber}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[120px] h-9 text-sm">
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
            <SelectTrigger className="w-[80px] h-9 text-sm">
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
      </div>

      {/* Loading Skeleton */}
      {isLoading && <DashboardSkeleton />}

      {/* Warnings */}
      {!isLoading && warnings && (
        <div className="space-y-2">
          {warnings.vcPerformanceWarning && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              {warnings.vcPerformanceWarning}
            </div>
          )}
          {warnings.grossProfitWarning && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
              {warnings.grossProfitWarning}
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Net Capital */}
          <div className="bg-[#192473] rounded-xl p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/60 mb-1">Net Capital</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(totalNetCapital)}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-white/80" />
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className={`rounded-xl p-5 text-white ${(grossProfitData?.grossProfit || 0) >= 0 ? "bg-emerald-500" : "bg-red-500"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/60 mb-1">Gross Profit</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(grossProfitData?.grossProfit || 0)}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {formatPercentage(grossProfitData?.grossProfitPercentage || 0)}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                {(grossProfitData?.grossProfit || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-white/80" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-white/80" />
                )}
              </div>
            </div>
          </div>

          {/* AUM */}
          <div className="bg-[#FFEB7A] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#192473]/60 mb-1">AUM</p>
                <p className="text-xl font-semibold text-[#192473]">
                  {formatCurrency(vcPerformanceData?.latestAUM || 0)}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#192473]/10 flex items-center justify-center">
                <PieChart className="h-4 w-4 text-[#192473]/80" />
              </div>
            </div>
          </div>

          {/* Active Accounts */}
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Accounts</p>
                <p className="text-xl font-semibold text-foreground">{totalActiveAccounts}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow */}
      {!isLoading && inflowData && outflowData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Inflow</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {formatCurrency(inflowData.totalNetInflowFunds)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {inflowData.newAccountsCount} new accounts
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Outflow</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(outflowData.totalOutflow)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {outflowData.outflowCount} transactions
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Types */}
      {!isLoading && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fixed-rate">Fixed Rate</TabsTrigger>
            <TabsTrigger value="floating-rate">Floating Rate</TabsTrigger>
            <TabsTrigger value="installment">Installment</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Fixed Rate */}
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#192473]/10 flex items-center justify-center">
                      <Percent className="w-4 h-4 text-[#192473]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-foreground">Fixed Rate</h3>
                      <p className="text-xs text-muted-foreground">
                        {principleData?.activeAccountsCount || 0} accounts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Net Capital</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(principleData?.totalNetCapital || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Gain</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatCurrency(cofData?.totalGainFund || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Rate */}
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-foreground">Floating Rate</h3>
                      <p className="text-xs text-muted-foreground">
                        {floatingRatePrincipleData?.activeAccountsCount || 0} accounts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Net Capital</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(floatingRatePrincipleData?.totalNetCapital || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Allocated Profit</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatCurrency(floatingRateAllocatedProfitData?.floatingRateAllocatedProfit || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Installment */}
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FFEB7A]/30 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-foreground">Installment</h3>
                      <p className="text-xs text-muted-foreground">
                        {installmentPrincipleData?.activeAccountsCount || 0} accounts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Net Capital</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(installmentPrincipleData?.totalNetCapital || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Gained Funds</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {formatCurrency(installmentCoFData?.totalGainedFunds || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fixed-rate" className="space-y-4">
            {principleData && cofData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Gross Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(principleData.totalGrossCapital)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Admin Fees</p>
                    <p className="text-lg font-semibold text-amber-600">{formatCurrency(principleData.totalAdminFees)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Net Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(principleData.totalNetCapital)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Gain</p>
                    <p className="text-lg font-semibold text-emerald-600">{formatCurrency(cofData.totalGainFund)}</p>
                  </div>
                </div>

                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium text-sm">Active Accounts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Investor</th>
                          <th className="text-right">Net Capital</th>
                          <th className="text-right">Rate</th>
                          <th className="text-right">Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {principleData.accounts.slice(0, 10).map((account: any) => {
                          const cofAccount = cofData.accounts.find(
                            (c: any) => c.accountNumber === account.accountNumber
                          );
                          return (
                            <tr key={account.id}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{account.accountNumber}</span>
                                  {account.isRollover && (
                                    <Badge className="bg-[#FFEB7A] text-[#192473] border-0 text-[10px] px-1.5 py-0">
                                      Rollover
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-muted-foreground">{account.investorEmail || "-"}</td>
                              <td className="text-right font-medium">{formatCurrency(account.netCapital)}</td>
                              <td className="text-right">{cofAccount ? `${(cofAccount.annualRate * 100).toFixed(1)}%` : "-"}</td>
                              <td className="text-right font-medium text-emerald-600">
                                {cofAccount ? formatCurrency(cofAccount.totalGain) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="floating-rate" className="space-y-4">
            {floatingRatePrincipleData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Gross Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(floatingRatePrincipleData.totalGrossCapital)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Admin Fees</p>
                    <p className="text-lg font-semibold text-amber-600">{formatCurrency(floatingRatePrincipleData.totalAdminFees)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Net Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(floatingRatePrincipleData.totalNetCapital)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Allocated Profit</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {formatCurrency(floatingRateAllocatedProfitData?.floatingRateAllocatedProfit || 0)}
                    </p>
                  </div>
                </div>

                {floatingRateGrowthData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-border rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Performance %</p>
                      <p className="text-lg font-semibold">{formatPercentage(floatingRateGrowthData.performancePercentage)}</p>
                    </div>
                    <div className="bg-white border border-border rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Growth %</p>
                      <p className="text-lg font-semibold text-emerald-600">{formatPercentage(floatingRateGrowthData.growthPercentage)}</p>
                    </div>
                    <div className="bg-white border border-border rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Rule</p>
                      <p className="text-sm text-[#192473]">{floatingRateGrowthData.calculation.rule}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium text-sm">Active Accounts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Investor</th>
                          <th className="text-right">Net Capital</th>
                          <th className="text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {floatingRatePrincipleData.accounts.slice(0, 10).map((account: any) => (
                          <tr key={account.id}>
                            <td className="font-medium">{account.accountNumber}</td>
                            <td className="text-muted-foreground">{account.investorEmail || "-"}</td>
                            <td className="text-right font-medium">{formatCurrency(account.netCapital)}</td>
                            <td className="text-right text-muted-foreground">
                              {format(new Date(account.transactionDate), "dd MMM yyyy")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="installment" className="space-y-4">
            {installmentPrincipleData && installmentCoFData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Gross Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(installmentPrincipleData.totalGrossCapital)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Admin Fees</p>
                    <p className="text-lg font-semibold text-amber-600">{formatCurrency(installmentPrincipleData.totalAdminFees)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Net Capital</p>
                    <p className="text-lg font-semibold">{formatCurrency(installmentPrincipleData.totalNetCapital)}</p>
                  </div>
                  <div className="bg-white border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Gained Funds</p>
                    <p className="text-lg font-semibold text-emerald-600">{formatCurrency(installmentCoFData.totalGainedFunds)}</p>
                  </div>
                </div>

                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-medium text-sm">Active Accounts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Investor</th>
                          <th>Type</th>
                          <th className="text-right">Net Capital</th>
                          <th className="text-right">Monthly CoF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentPrincipleData.accounts.slice(0, 10).map((account: any) => (
                          <tr key={account.id}>
                            <td className="font-medium">{account.accountNumber}</td>
                            <td className="text-muted-foreground">{account.investorEmail || "-"}</td>
                            <td>
                              <Badge
                                className={
                                  account.investmentType === "principle"
                                    ? "bg-[#192473] text-white border-0 text-[10px]"
                                    : "bg-muted text-muted-foreground border-0 text-[10px]"
                                }
                              >
                                {account.investmentType === "principle" ? "Principle" : "Interest Only"}
                              </Badge>
                            </td>
                            <td className="text-right font-medium">{formatCurrency(account.netCapital)}</td>
                            <td className="text-right text-emerald-600">{formatCurrency(account.monthlyCof)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
