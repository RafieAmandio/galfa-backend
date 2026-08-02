"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/db/supabase/browser";
import type { ComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import type { FundAllocation } from "@/features/fund-allocations/actions/get-fund-allocations";
import { DownloadPdfButton } from "@/features/reports/components/download-pdf-button";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  BarChart3,
  FileText,
  ChevronRight,
  Percent,
  Calendar,
  AlertCircle,
  RefreshCw,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface FundAllocationsSummary {
  totalAum: number;
  totalAllocations: number;
  allocations: FundAllocation[];
}

interface VCPerformanceData {
  date: Date;
  aum: number;
}

interface InvestorSummaryViewProps {
  user: {
    id: string;
    email: string;
    [key: string]: any;
  };
  summary: ComprehensiveInvestorSummary | null;
  fundAllocations: FundAllocationsSummary | null;
  vcPerformance: VCPerformanceData[];
  error?: string;
}

export function InvestorSummaryView({
  user,
  summary,
  fundAllocations,
  vcPerformance,
  error,
}: InvestorSummaryViewProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}M`;
    }
    return formatCurrency(amount);
  };

  // Format real VC performance data for the chart
  const formatPerformanceData = () => {
    if (!vcPerformance || vcPerformance.length === 0) return [];

    return vcPerformance.map((record) => {
      const date = new Date(record.date);
      const month = date.toLocaleDateString("en-US", { month: "short" });
      return {
        month,
        aum: record.aum,
      };
    });
  };

  // Generate portfolio allocation data
  const getPortfolioAllocation = () => {
    if (!summary) return [];
    const data = [];

    if (summary.flatRateInvestments.hasData) {
      data.push({
        name: "Flat Rate",
        value: summary.flatRateInvestments.totalNetInvestedFund,
        color: "#192473",
      });
    }
    if (summary.floatingRateInvestments.hasData) {
      data.push({
        name: "Floating Rate",
        value: summary.floatingRateInvestments.totalNetCapital,
        color: "#10b981",
      });
    }
    if (summary.installmentInvestments.hasData) {
      data.push({
        name: "Installment",
        value: summary.installmentInvestments.totalNetInvestorFund,
        color: "#FFEB7A",
      });
    }

    return data;
  };

  const performanceData = formatPerformanceData();
  const portfolioAllocation = getPortfolioAllocation();
  const COLORS = ["#192473", "#10b981", "#FFEB7A", "#f59e0b"];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Complete Investment Portfolio</h1>
          <p className="text-muted-foreground">
            Get comprehensive insights into all your investments
          </p>
        </div>
        <DownloadPdfButton email={user.email} variant="outline" size="sm" />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 mb-1">Unable to Load Portfolio</h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={() => router.refresh()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!summary && !error && (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Active Investments</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You don't have any active investments yet. Contact your advisor to get started.
          </p>
        </div>
      )}

      {/* Summary Display */}
      {summary && (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Net Fund */}
            <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-success text-white shadow-soft-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">
                    Total Net Fund
                  </p>
                  <p className="text-2xl font-bold mb-1">
                    {formatCurrency(summary.totalNetInvestedFund)}
                  </p>
                  <p className="text-xs text-white/60">Amount actively working</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Current Value */}
            <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-navy text-white shadow-soft-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">
                    Current Value
                  </p>
                  <p className="text-2xl font-bold mb-1">
                    {formatCurrency(summary.totalNetPresentValue)}
                  </p>
                  <p className="text-xs text-white/60">Present portfolio value</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Total Performance */}
            <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-soft-lg ${summary.totalGainLoss >= 0 ? "card-gradient-gold" : "card-gradient-danger"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-medium uppercase tracking-wide mb-2 ${summary.totalGainLoss >= 0 ? "text-primary/70" : "text-white/70"}`}>
                    Total Performance
                  </p>
                  <p className={`text-2xl font-bold mb-1 ${summary.totalGainLoss >= 0 ? "text-primary" : "text-white"}`}>
                    {formatCurrency(summary.totalGainLoss)}
                  </p>
                  <p className={`text-xs ${summary.totalGainLoss >= 0 ? "text-primary/60" : "text-white/60"}`}>
                    {formatPercent(summary.totalGainLossPercentage)} overall return
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary.totalGainLoss >= 0 ? "bg-primary/20" : "bg-white/20"}`}>
                  {summary.totalGainLoss >= 0 ? (
                    <TrendingUp className={`w-6 h-6 ${summary.totalGainLoss >= 0 ? "text-primary" : "text-white"}`} />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Active Investments */}
            <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-warning text-white shadow-soft-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">
                    Active Investments
                  </p>
                  <p className="text-2xl font-bold mb-1">{summary.activeInvestments}</p>
                  <p className="text-xs text-white/60">Total investment accounts</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Total Company AUM Card */}
          {fundAllocations && (
            <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#192473] via-[#1e2d8a] to-[#2a3a9e] text-white shadow-soft-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70 uppercase tracking-wide mb-2">
                    Total Company AUM
                  </p>
                  <p className="text-3xl font-bold mb-1">
                    {formatCompactCurrency(fundAllocations.totalAum)}
                  </p>
                  <p className="text-sm text-white/60">
                    {fundAllocations.totalAllocations} portfolio companies
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
            </div>
          )}

          {/* Company AUM Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AUM Performance Chart */}
            <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Company AUM Performance</h3>
                  <p className="text-sm text-muted-foreground">Total Assets Under Management over time</p>
                </div>
                {fundAllocations && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current Total</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCompactCurrency(fundAllocations.totalAum)}
                    </p>
                  </div>
                )}
              </div>

              {performanceData.length > 0 ? (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#192473" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#192473" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#5a6785", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#5a6785", fontSize: 12 }}
                          tickFormatter={(value) => formatCompactCurrency(value)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: number) => [formatCurrency(value), ""]}
                        />
                        <Area
                          type="monotone"
                          dataKey="aum"
                          stroke="#192473"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorAum)"
                          name="Company AUM"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">Company AUM</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No AUM performance data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio Allocation */}
            <div className="bg-card rounded-2xl shadow-soft p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Portfolio Allocation</h3>
                <p className="text-sm text-muted-foreground">Distribution by investment type</p>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {portfolioAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: number) => [formatCurrency(value), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 mt-4">
                {portfolioAllocation.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatCompactCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Company AUM / Fund Allocations */}
          {fundAllocations && fundAllocations.allocations.length > 0 && (
            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Company AUM</h3>
                      <p className="text-sm text-muted-foreground">
                        Portfolio company allocations - {fundAllocations.totalAllocations} companies
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total AUM</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCompactCurrency(fundAllocations.totalAum)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {fundAllocations.allocations.slice(0, 6).map((allocation) => (
                    <div
                      key={allocation.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{allocation.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {allocation.description || "No description"}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-foreground">
                          {formatCompactCurrency(allocation.aum)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {allocation.rate_label ||
                            `${allocation.rate_type === "loan" ? "Loan" : "ROE"}: ${allocation.rate_value}%`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {fundAllocations.allocations.length > 6 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    + {fundAllocations.allocations.length - 6} more companies
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Investment Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Flat Rate Investments */}
            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Percent className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Flat Rate</h3>
                      <p className="text-xs text-muted-foreground">Fixed return investments</p>
                    </div>
                  </div>
                  {summary.flatRateInvestments.hasData && (
                    <Badge className="bg-primary text-white border-0">
                      {summary.flatRateInvestments.activeInvestments}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-6">
                {summary.flatRateInvestments.hasData ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Net Fund</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.flatRateInvestments.totalNetInvestedFund)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Value</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.flatRateInvestments.totalNetPresentValue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gain/Loss</span>
                      <span className={`font-semibold ${summary.flatRateInvestments.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(summary.flatRateInvestments.totalGainLoss)}
                      </span>
                    </div>
                    <Link
                      href="/investor/flat-rate"
                      className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No records available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Rate Investments */}
            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Floating Rate</h3>
                      <p className="text-xs text-muted-foreground">Variable return investments</p>
                    </div>
                  </div>
                  {summary.floatingRateInvestments.hasData && (
                    <Badge className="bg-emerald-500 text-white border-0">
                      {summary.floatingRateInvestments.activeInvestments}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-6">
                {summary.floatingRateInvestments.hasData ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Net Capital</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.floatingRateInvestments.totalNetCapital)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gained Fund</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.floatingRateInvestments.totalGainedFund)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gain/Loss</span>
                      <span className={`font-semibold ${(summary.floatingRateInvestments.totalGainedFund - summary.floatingRateInvestments.totalNetCapital) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(summary.floatingRateInvestments.totalGainedFund - summary.floatingRateInvestments.totalNetCapital)}
                      </span>
                    </div>
                    <Link
                      href="/investor/floating-rate"
                      className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-emerald-500/10 text-emerald-600 font-medium rounded-xl hover:bg-emerald-500/20 transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No records available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Installment Investments */}
            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FFEB7A]/30 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Installment</h3>
                      <p className="text-xs text-muted-foreground">Periodic payment investments</p>
                    </div>
                  </div>
                  {summary.installmentInvestments.hasData && (
                    <Badge className="bg-amber-500 text-white border-0">
                      {summary.installmentInvestments.activeInvestments}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-6">
                {summary.installmentInvestments.hasData ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Net Fund</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.installmentInvestments.totalNetInvestorFund)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Redeemed</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(summary.installmentInvestments.totalRedeemedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gain/Loss</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(summary.installmentInvestments.totalRedeemedAmount)}
                      </span>
                    </div>
                    <Link
                      href="/investor/installments"
                      className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-amber-500/10 text-amber-600 font-medium rounded-xl hover:bg-amber-500/20 transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No records available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl shadow-soft p-6">
            <h2 className="text-lg font-bold text-foreground mb-6">Detailed Investment Views</h2>
            <p className="text-muted-foreground mb-6">
              Access detailed analysis and performance tracking for each investment type
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summary.flatRateInvestments.hasData ? (
                <Link
                  href="/investor/flat-rate"
                  className="flex items-center justify-between p-5 rounded-xl bg-primary/5 border border-[#192473]/10 hover:bg-primary/10 transition-colors group"
                >
                  <div>
                    <h3 className="font-bold text-primary mb-1">Flat Rate Details</h3>
                    <p className="text-xs text-muted-foreground">
                      View detailed breakdown with compound interest calculations
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="p-5 rounded-xl bg-muted/50 border border-border/50 opacity-50 cursor-not-allowed">
                  <h3 className="font-bold text-muted-foreground mb-1">Flat Rate Details</h3>
                  <p className="text-xs text-muted-foreground">No flat rate investments available</p>
                </div>
              )}

              {summary.floatingRateInvestments.hasData ? (
                <Link
                  href="/investor/floating-rate"
                  className="flex items-center justify-between p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors group"
                >
                  <div>
                    <h3 className="font-bold text-emerald-600 mb-1">Floating Rate Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Track with real-time market adjustments
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="p-5 rounded-xl bg-muted/50 border border-border/50 opacity-50 cursor-not-allowed">
                  <h3 className="font-bold text-muted-foreground mb-1">Floating Rate Details</h3>
                  <p className="text-xs text-muted-foreground">No floating rate investments available</p>
                </div>
              )}

              {summary.installmentInvestments.hasData ? (
                <Link
                  href="/investor/installments"
                  className="flex items-center justify-between p-5 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors group"
                >
                  <div>
                    <h3 className="font-bold text-amber-600 mb-1">Installment Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Monitor schedule and net investor fund
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="p-5 rounded-xl bg-muted/50 border border-border/50 opacity-50 cursor-not-allowed">
                  <h3 className="font-bold text-muted-foreground mb-1">Installment Details</h3>
                  <p className="text-xs text-muted-foreground">No installment investments available</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
