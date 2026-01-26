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
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  AlertTriangle,
  Calendar,
  BarChart3,
  Percent,
  ChevronRight,
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monthly analytics and performance overview
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card rounded-xl border border-border/50 p-1 shadow-soft">
            <Select
              value={selectedMonthNumber}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[130px] border-0 shadow-none bg-transparent">
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
              <SelectTrigger className="w-[90px] border-0 shadow-none bg-transparent">
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
          <Badge className="px-4 py-2 bg-[#192473] text-white border-0">
            <Calendar className="h-4 w-4 mr-2" />
            {format(selectedMonth, "MMMM yyyy")}
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 bg-card rounded-xl border border-border/50 px-6 py-4 shadow-soft">
            <Loader2 className="h-5 w-5 text-[#192473] animate-spin" />
            <span className="text-muted-foreground">Loading dashboard data...</span>
          </div>
        </div>
      )}

      {/* Warnings */}
      {!isLoading && warnings && (
        <div className="space-y-3">
          {warnings.vcPerformanceWarning && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-sm text-amber-800">
                {warnings.vcPerformanceWarning}
              </p>
            </div>
          )}
          {warnings.grossProfitWarning && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-sm text-orange-800">
                {warnings.grossProfitWarning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main KPIs */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Net Capital */}
          <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-navy text-white shadow-soft-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-2">
                  Total Net Capital
                </p>
                <p className="text-2xl font-bold mb-1">
                  {formatCurrency(totalNetCapital)}
                </p>
                <p className="text-xs text-white/60">All investment types</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-soft-lg ${(grossProfitData?.grossProfit || 0) >= 0 ? "card-gradient-success" : "card-gradient-danger"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-2">
                  Gross Profit
                </p>
                <p className="text-2xl font-bold mb-1">
                  {formatCurrency(grossProfitData?.grossProfit || 0)}
                </p>
                <p className="text-xs text-white/60">
                  {formatPercentage(grossProfitData?.grossProfitPercentage || 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                {(grossProfitData?.grossProfit || 0) >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-white" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
          </div>

          {/* AUM */}
          <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-gold shadow-soft-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#192473]/70 mb-2">
                  Assets Under Management
                </p>
                <p className="text-2xl font-bold text-[#192473] mb-1">
                  {formatCurrency(vcPerformanceData?.latestAUM || 0)}
                </p>
                <p className="text-xs text-[#192473]/60">Current AUM</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#192473]/20 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-[#192473]" />
              </div>
            </div>
          </div>

          {/* Active Accounts */}
          <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-warning text-white shadow-soft-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-2">
                  Active Accounts
                </p>
                <p className="text-2xl font-bold mb-1">{totalActiveAccounts}</p>
                <p className="text-xs text-white/60">Total accounts</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow */}
      {!isLoading && inflowData && outflowData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl shadow-soft p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Inflow</p>
                <p className="text-2xl font-bold text-emerald-600 mb-1">
                  {formatCurrency(inflowData.totalNetInflowFunds)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inflowData.newAccountsCount} new accounts
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-soft p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Outflow</p>
                <p className="text-2xl font-bold text-red-600 mb-1">
                  {formatCurrency(outflowData.totalOutflow)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {outflowData.outflowCount} transactions
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Type Tabs */}
      {!isLoading && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border/50 rounded-xl p-1 shadow-soft">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-[#192473] data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="fixed-rate" className="rounded-lg data-[state=active]:bg-[#192473] data-[state=active]:text-white">
              Fixed Rate
            </TabsTrigger>
            <TabsTrigger value="floating-rate" className="rounded-lg data-[state=active]:bg-[#192473] data-[state=active]:text-white">
              Floating Rate
            </TabsTrigger>
            <TabsTrigger value="installment" className="rounded-lg data-[state=active]:bg-[#192473] data-[state=active]:text-white">
              Installment
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fixed Rate Card */}
              <div className="bg-card rounded-2xl shadow-soft overflow-hidden hover-lift">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#192473]/10 flex items-center justify-center">
                      <Percent className="w-6 h-6 text-[#192473]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Fixed Rate</h3>
                      <p className="text-xs text-muted-foreground">
                        {principleData?.activeAccountsCount || 0} accounts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Net Capital</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(principleData?.totalNetCapital || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Gain (CoF)</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(cofData?.totalGainFund || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Return</span>
                    <span className="font-semibold text-foreground">
                      {formatPercentage(cofData?.averageReturnPercentage || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Rate Card */}
              <div className="bg-card rounded-2xl shadow-soft overflow-hidden hover-lift">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Floating Rate</h3>
                      <p className="text-xs text-muted-foreground">
                        {floatingRatePrincipleData?.activeAccountsCount || 0} accounts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Net Capital</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(floatingRatePrincipleData?.totalNetCapital || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Allocated Profit</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(floatingRateAllocatedProfitData?.floatingRateAllocatedProfit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Growth</span>
                    <span className="font-semibold text-foreground">
                      {formatPercentage(floatingRateGrowthData?.growthPercentage || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Installment Card */}
              <div className="bg-card rounded-2xl shadow-soft overflow-hidden hover-lift">
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FFEB7A]/30 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Installment</h3>
                      <p className="text-xs text-muted-foreground">
                        {installmentPrincipleData?.activeAccountsCount || 0} accounts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Net Capital</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(installmentPrincipleData?.totalNetCapital || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gained Funds</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(installmentCoFData?.totalGainedFunds || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Return</span>
                    <span className="font-semibold text-foreground">
                      {formatPercentage(installmentCoFData?.averageReturnPercentage || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gross Profit Breakdown */}
            {grossProfitData && (
              <div className="bg-card rounded-2xl shadow-soft p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">Gross Profit Breakdown</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedMonth, "MMMM yyyy")} portfolio performance
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-[#192473]/5 rounded-xl">
                    <p className="text-xs text-[#192473] font-medium mb-1">Current AUM</p>
                    <p className="text-sm font-bold text-[#192473]">
                      {formatCurrency(grossProfitData.currentMonthAUM)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Previous AUM</p>
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(grossProfitData.previousMonthAUM)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Total Inflow</p>
                    <p className="text-sm font-bold text-emerald-700">
                      {formatCurrency(grossProfitData.totalInflow)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <p className="text-xs text-red-600 font-medium mb-1">Total Outflow</p>
                    <p className="text-sm font-bold text-red-700">
                      {formatCurrency(grossProfitData.totalOutflow)}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Formula</p>
                  <p className="text-sm text-foreground">{grossProfitData.calculation.formula}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Fixed Rate Tab */}
          <TabsContent value="fixed-rate" className="space-y-6">
            {principleData && cofData && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Gross Capital</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(principleData.totalGrossCapital)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Admin Fees</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(principleData.totalAdminFees)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Net Capital</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(principleData.totalNetCapital)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Total Gain</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(cofData.totalGainFund)}
                    </p>
                  </div>
                </div>

                {/* Accounts Table */}
                <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
                  <div className="p-6 border-b border-border/50">
                    <h3 className="font-bold text-foreground">Active Accounts</h3>
                    <p className="text-sm text-muted-foreground">
                      {principleData.activeAccountsCount} fixed rate accounts
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr className="bg-muted/30">
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
                                    <Badge className="bg-[#FFEB7A] text-[#192473] border-0 text-xs">
                                      Rollover
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-muted-foreground">
                                {account.investorEmail || "-"}
                              </td>
                              <td className="text-right font-medium">
                                {formatCurrency(account.netCapital)}
                              </td>
                              <td className="text-right">
                                {cofAccount ? `${(cofAccount.annualRate * 100).toFixed(1)}%` : "-"}
                              </td>
                              <td className="text-right font-medium text-emerald-600">
                                {cofAccount ? formatCurrency(cofAccount.totalGain) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {principleData.accounts.length > 10 && (
                      <div className="p-4 text-center border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          Showing 10 of {principleData.accounts.length} accounts
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Floating Rate Tab */}
          <TabsContent value="floating-rate" className="space-y-6">
            {floatingRatePrincipleData && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Gross Capital</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(floatingRatePrincipleData.totalGrossCapital)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Admin Fees</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(floatingRatePrincipleData.totalAdminFees)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Net Capital</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(floatingRatePrincipleData.totalNetCapital)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Allocated Profit</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(floatingRateAllocatedProfitData?.floatingRateAllocatedProfit || 0)}
                    </p>
                  </div>
                </div>

                {/* Growth Performance */}
                {floatingRateGrowthData && (
                  <div className="bg-card rounded-2xl shadow-soft p-6">
                    <h3 className="font-bold text-foreground mb-4">Growth Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/30 rounded-xl">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Performance %</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatPercentage(floatingRateGrowthData.performancePercentage)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-xl">
                        <p className="text-xs text-emerald-600 font-medium mb-1">Growth %</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {formatPercentage(floatingRateGrowthData.growthPercentage)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-[#192473]/5 rounded-xl">
                        <p className="text-xs text-[#192473] font-medium mb-1">Calculation Rule</p>
                        <p className="text-sm text-[#192473]">
                          {floatingRateGrowthData.calculation.rule}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accounts Table */}
                <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
                  <div className="p-6 border-b border-border/50">
                    <h3 className="font-bold text-foreground">Active Accounts</h3>
                    <p className="text-sm text-muted-foreground">
                      {floatingRatePrincipleData.activeAccountsCount} floating rate accounts
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr className="bg-muted/30">
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
                            <td className="text-right font-medium">
                              {formatCurrency(account.netCapital)}
                            </td>
                            <td className="text-right text-muted-foreground">
                              {format(new Date(account.transactionDate), "dd MMM yyyy")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {floatingRatePrincipleData.accounts.length > 10 && (
                      <div className="p-4 text-center border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          Showing 10 of {floatingRatePrincipleData.accounts.length} accounts
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Installment Tab */}
          <TabsContent value="installment" className="space-y-6">
            {installmentPrincipleData && installmentCoFData && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Gross Capital</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(installmentPrincipleData.totalGrossCapital)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Admin Fees</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(installmentPrincipleData.totalAdminFees)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Net Capital</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(installmentPrincipleData.totalNetCapital)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl shadow-soft p-5">
                    <p className="text-sm text-muted-foreground mb-1">Gained Funds</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(installmentCoFData.totalGainedFunds)}
                    </p>
                  </div>
                </div>

                {/* Accounts Table */}
                <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
                  <div className="p-6 border-b border-border/50">
                    <h3 className="font-bold text-foreground">Active Accounts</h3>
                    <p className="text-sm text-muted-foreground">
                      {installmentPrincipleData.activeAccountsCount} installment accounts
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr className="bg-muted/30">
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
                                    ? "bg-[#192473] text-white border-0"
                                    : "bg-muted text-muted-foreground border-0"
                                }
                              >
                                {account.investmentType === "principle" ? "Principle" : "Interest Only"}
                              </Badge>
                            </td>
                            <td className="text-right font-medium">
                              {formatCurrency(account.netCapital)}
                            </td>
                            <td className="text-right text-emerald-600">
                              {formatCurrency(account.monthlyCof)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {installmentPrincipleData.accounts.length > 10 && (
                      <div className="p-4 text-center border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          Showing 10 of {installmentPrincipleData.accounts.length} accounts
                        </p>
                      </div>
                    )}
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
