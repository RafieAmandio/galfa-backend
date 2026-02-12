"use client";

import Auth from "@/components/Auth";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";
import type { ComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BarChart3,
  FileText,
  ArrowRight,
  Percent,
  Calendar,
  Activity,
  ChevronRight,
} from "lucide-react";

interface HomeViewProps {
  user: User | null;
  isAdmin: boolean;
  portfolioSummary: ComprehensiveInvestorSummary | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Mini chart SVG component for stat cards
function MiniChart({ trend = "up" }: { trend?: "up" | "down" }) {
  return (
    <svg viewBox="0 0 60 30" className="w-16 h-8 opacity-60">
      <path
        d={
          trend === "up"
            ? "M0 25 L10 20 L20 22 L30 15 L40 18 L50 10 L60 5"
            : "M0 5 L10 10 L20 8 L30 15 L40 12 L50 20 L60 25"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HomeView({ user, isAdmin, portfolioSummary }: HomeViewProps) {
  if (!user) {
    return <Auth />;
  }

  const hasInvestments = portfolioSummary !== null;
  const gainLossIsPositive = (portfolioSummary?.totalGainLoss ?? 0) >= 0;

  return (
    <div className="space-y-8">
      {/* Portfolio Summary Cards - Like reference design with gradients */}
      {hasInvestments ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Invested Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-navy text-white shadow-soft-lg hover-lift">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">Total Invested</span>
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {gainLossIsPositive ? "+" : ""}{portfolioSummary.totalGainLossPercentage.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold mb-1">
                {formatCurrency(portfolioSummary.totalNetInvestedFund)}
              </p>
              <p className="text-xs text-white/60">Net invested fund</p>
            </div>
            <div className="absolute right-4 bottom-4 text-white/30">
              <MiniChart trend="up" />
            </div>
          </div>

          {/* Current Value Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-success text-white shadow-soft-lg hover-lift">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">Current Value</span>
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  +{((portfolioSummary.totalNetPresentValue / portfolioSummary.totalNetInvestedFund - 1) * 100).toFixed(1)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold mb-1">
                {formatCurrency(portfolioSummary.totalNetPresentValue)}
              </p>
              <p className="text-xs text-white/60">Present portfolio value</p>
            </div>
            <div className="absolute right-4 bottom-4 text-white/30">
              <MiniChart trend="up" />
            </div>
          </div>

          {/* Total Gain/Loss Card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-soft-lg hover-lift ${gainLossIsPositive ? "card-gradient-gold" : "card-gradient-danger"}`}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-medium ${gainLossIsPositive ? "text-[#192473]/70" : "text-white/70"}`}>
                  Total Gain/Loss
                </span>
                <Badge className={`border-0 text-xs ${gainLossIsPositive ? "bg-[#192473]/20 text-[#192473]" : "bg-white/20 text-white"}`}>
                  {formatPercent(portfolioSummary.totalGainLossPercentage)}
                </Badge>
              </div>
              <p className={`text-2xl font-bold mb-1 ${gainLossIsPositive ? "text-[#192473]" : "text-white"}`}>
                {formatCurrency(portfolioSummary.totalGainLoss)}
              </p>
              <p className={`text-xs ${gainLossIsPositive ? "text-[#192473]/60" : "text-white/60"}`}>
                Overall return
              </p>
            </div>
            <div className={`absolute right-4 bottom-4 ${gainLossIsPositive ? "text-[#192473]/30" : "text-white/30"}`}>
              <MiniChart trend={gainLossIsPositive ? "up" : "down"} />
            </div>
          </div>

          {/* Active Investments Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 card-gradient-warning text-white shadow-soft-lg hover-lift">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">Active Investments</span>
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  Active
                </Badge>
              </div>
              <p className="text-2xl font-bold mb-1">
                {portfolioSummary.activeInvestments}
              </p>
              <p className="text-xs text-white/60">Investment accounts</p>
            </div>
            <div className="absolute right-4 bottom-4 text-white/30">
              <Activity className="w-12 h-12" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <PiggyBank className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No investments yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Your portfolio is empty. Check your investment summary for more details or contact your administrator.
          </p>
          <Link
            href="/investor/summary"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#192473] text-white font-semibold rounded-xl hover:bg-[#192473]/90 transition-colors"
          >
            View Investment Summary
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Investment Breakdown */}
      {hasInvestments && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flat Rate */}
          <div className="bg-card rounded-2xl shadow-soft p-6 hover-lift">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#192473]/10 flex items-center justify-center">
                  <Percent className="w-6 h-6 text-[#192473]" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Flat Rate</h3>
                  <p className="text-sm text-muted-foreground">Fixed return investments</p>
                </div>
              </div>
              {portfolioSummary.flatRateInvestments.hasData && (
                <Badge className="bg-[#192473]/10 text-[#192473] border-0">
                  {portfolioSummary.flatRateInvestments.activeInvestments} active
                </Badge>
              )}
            </div>
            {portfolioSummary.flatRateInvestments.hasData ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Invested</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(portfolioSummary.flatRateInvestments.totalNetInvestedFund)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Current Value</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(portfolioSummary.flatRateInvestments.totalNetPresentValue)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Return</span>
                  <span className={`font-semibold ${portfolioSummary.flatRateInvestments.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatPercent(portfolioSummary.flatRateInvestments.totalGainLossPercentage)}
                  </span>
                </div>
                <Link
                  href="/investor/flat-rate"
                  className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-muted/50 text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No flat rate investments</p>
            )}
          </div>

          {/* Floating Rate */}
          <div className="bg-card rounded-2xl shadow-soft p-6 hover-lift">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Floating Rate</h3>
                  <p className="text-sm text-muted-foreground">Variable return investments</p>
                </div>
              </div>
              {portfolioSummary.floatingRateInvestments.hasData && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                  {portfolioSummary.floatingRateInvestments.activeInvestments} active
                </Badge>
              )}
            </div>
            {portfolioSummary.floatingRateInvestments.hasData ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Net Capital</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(portfolioSummary.floatingRateInvestments.totalNetCapital)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Gained Fund</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(portfolioSummary.floatingRateInvestments.totalGainedFund)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Accounts</span>
                  <span className="font-semibold text-foreground">
                    {portfolioSummary.floatingRateInvestments.activeInvestments}
                  </span>
                </div>
                <Link
                  href="/investor/floating-rate"
                  className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-muted/50 text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No floating rate investments</p>
            )}
          </div>

          {/* Installment */}
          <div className="bg-card rounded-2xl shadow-soft p-6 hover-lift">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFEB7A]/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Installment</h3>
                  <p className="text-sm text-muted-foreground">Periodic payment investments</p>
                </div>
              </div>
              {portfolioSummary.installmentInvestments.hasData && (
                <Badge className="bg-[#FFEB7A]/30 text-amber-700 border-0">
                  {portfolioSummary.installmentInvestments.activeInvestments} active
                </Badge>
              )}
            </div>
            {portfolioSummary.installmentInvestments.hasData ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Net Invested</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(portfolioSummary.installmentInvestments.totalNetInvestorFund)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Redeemed</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(portfolioSummary.installmentInvestments.totalRedeemedAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Accounts</span>
                  <span className="font-semibold text-foreground">
                    {portfolioSummary.installmentInvestments.activeInvestments}
                  </span>
                </div>
                <Link
                  href="/investor/installments"
                  className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-muted/50 text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No installment investments</p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/investor/summary"
            className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-[#192473]/30 hover:bg-[#192473]/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#192473]/10 flex items-center justify-center group-hover:bg-[#192473] group-hover:text-white transition-colors">
              <FileText className="w-5 h-5 text-[#192473] group-hover:text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Investment Summary</p>
              <p className="text-xs text-muted-foreground">View all investments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[#192473]" />
          </Link>

          <Link
            href="/investor/floating-rate"
            className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5 text-emerald-600 group-hover:text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Floating Rate</p>
              <p className="text-xs text-muted-foreground">Variable investments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600" />
          </Link>

          <Link
            href="/investor/installments"
            className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5 text-amber-600 group-hover:text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Installments</p>
              <p className="text-xs text-muted-foreground">Periodic payments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-600" />
          </Link>

          <Link
            href="/investor/capital-market"
            className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-[#FFEB7A]/50 hover:bg-[#FFEB7A]/10 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FFEB7A]/30 flex items-center justify-center group-hover:bg-[#FFEB7A] transition-colors">
              <TrendingUp className="w-5 h-5 text-amber-700 group-hover:text-[#192473]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Capital Market</p>
              <p className="text-xs text-muted-foreground">Market investments</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-600" />
          </Link>
        </div>
      </div>

      {/* Admin Quick Actions */}
      {isAdmin && (
        <div className="bg-[#192473]/5 rounded-2xl p-6 border border-[#192473]/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#192473] flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Admin Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-soft hover:shadow-soft-lg transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#192473] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Dashboard</p>
                <p className="text-xs text-muted-foreground">Admin overview</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/user-management"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-soft hover:shadow-soft-lg transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#192473] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Users</p>
                <p className="text-xs text-muted-foreground">Manage users</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/reports"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-soft hover:shadow-soft-lg transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#192473] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Reports</p>
                <p className="text-xs text-muted-foreground">Generate reports</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link
              href="/admin/performance"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-soft hover:shadow-soft-lg transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#192473] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Performance</p>
                <p className="text-xs text-muted-foreground">Track metrics</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
