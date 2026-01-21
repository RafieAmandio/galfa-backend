"use client";

import Auth from "@/components/Auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { User } from "@supabase/supabase-js";
import type { ComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  BarChart3,
  FileText,
  Users,
  Settings,
  ArrowRight,
  Percent,
  Calendar,
  Activity,
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

export function HomeView({ user, isAdmin, portfolioSummary }: HomeViewProps) {
  if (!user) {
    return <Auth />;
  }

  const hasInvestments = portfolioSummary !== null;
  const gainLossIsPositive = (portfolioSummary?.totalGainLoss ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            {isAdmin && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Admin
              </Badge>
            )}
          </div>
          <p className="text-slate-600">
            Here&apos;s an overview of your investment portfolio
          </p>
        </div>

        {/* Portfolio Summary Section */}
        {hasInvestments ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Invested */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Invested
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(portfolioSummary.totalNetInvestedFund)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Value */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Current Value
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(portfolioSummary.totalNetPresentValue)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                    <PiggyBank className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Gain/Loss */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Gain/Loss
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        gainLossIsPositive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(portfolioSummary.totalGainLoss)}
                    </p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      gainLossIsPositive ? "bg-emerald-50" : "bg-red-50"
                    }`}
                  >
                    {gainLossIsPositive ? (
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-sm mt-2 ${
                    gainLossIsPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(portfolioSummary.totalGainLossPercentage)}
                </p>
              </CardContent>
            </Card>

            {/* Active Investments */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Active Investments
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {portfolioSummary.activeInvestments}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-0 shadow-sm bg-white mb-8">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No investments yet
              </h3>
              <p className="text-slate-500 mb-4">
                Your portfolio is empty. Check your investment summary for more
                details.
              </p>
              <Button asChild>
                <Link href="/investor/summary">View Investment Summary</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Investment Breakdown */}
        {hasInvestments && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {/* Flat Rate */}
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Percent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Flat Rate</CardTitle>
                      <CardDescription>Fixed return investments</CardDescription>
                    </div>
                  </div>
                  {portfolioSummary.flatRateInvestments.hasData && (
                    <Badge variant="secondary">
                      {portfolioSummary.flatRateInvestments.activeInvestments} active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {portfolioSummary.flatRateInvestments.hasData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Invested</span>
                      <span className="font-medium">
                        {formatCurrency(
                          portfolioSummary.flatRateInvestments.totalNetInvestedFund
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Current Value</span>
                      <span className="font-medium">
                        {formatCurrency(
                          portfolioSummary.flatRateInvestments.totalNetPresentValue
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Return</span>
                      <span
                        className={`font-medium ${
                          portfolioSummary.flatRateInvestments.totalGainLoss >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatPercent(
                          portfolioSummary.flatRateInvestments.totalGainLossPercentage
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No flat rate investments</p>
                )}
              </CardContent>
            </Card>

            {/* Floating Rate */}
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Floating Rate</CardTitle>
                      <CardDescription>Variable return investments</CardDescription>
                    </div>
                  </div>
                  {portfolioSummary.floatingRateInvestments.hasData && (
                    <Badge variant="secondary">
                      {portfolioSummary.floatingRateInvestments.activeInvestments} active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {portfolioSummary.floatingRateInvestments.hasData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Net Capital</span>
                      <span className="font-medium">
                        {formatCurrency(
                          portfolioSummary.floatingRateInvestments.totalNetCapital
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Gained Fund</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(
                          portfolioSummary.floatingRateInvestments.totalGainedFund
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Admin Fees</span>
                      <span className="font-medium">
                        {formatCurrency(
                          portfolioSummary.floatingRateInvestments.totalAdminFees
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No floating rate investments
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Installment */}
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Installment</CardTitle>
                      <CardDescription>Periodic payment investments</CardDescription>
                    </div>
                  </div>
                  {portfolioSummary.installmentInvestments.hasData && (
                    <Badge variant="secondary">
                      {portfolioSummary.installmentInvestments.activeInvestments} active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {portfolioSummary.installmentInvestments.hasData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Net Invested</span>
                      <span className="font-medium">
                        {formatCurrency(
                          portfolioSummary.installmentInvestments.totalNetInvestorFund
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Redeemed</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(
                          portfolioSummary.installmentInvestments.totalRedeemedAmount
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No installment investments</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            asChild
            variant="outline"
            className="h-auto py-4 justify-start border-slate-200 hover:bg-slate-50"
          >
            <Link href="/investor/summary" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-slate-900">Investment Summary</div>
                <div className="text-sm text-slate-500">View all investments</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto py-4 justify-start border-slate-200 hover:bg-slate-50"
          >
            <Link href="/investor/floating-rate" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-slate-900">Floating Rate</div>
                <div className="text-sm text-slate-500">Variable investments</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto py-4 justify-start border-slate-200 hover:bg-slate-50"
          >
            <Link href="/investor/installment" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-slate-900">Installments</div>
                <div className="text-sm text-slate-500">Periodic payments</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto py-4 justify-start border-slate-200 hover:bg-slate-50"
          >
            <Link href="/investor/capital-market" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-slate-900">Capital Market</div>
                <div className="text-sm text-slate-500">Market investments</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
            </Link>
          </Button>
        </div>

        {/* Admin Quick Actions */}
        {isAdmin && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Admin Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                asChild
                variant="outline"
                className="h-auto py-4 justify-start border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
              >
                <Link href="/admin/dashboard" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">Dashboard</div>
                    <div className="text-sm text-slate-500">Admin overview</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-auto py-4 justify-start border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
              >
                <Link href="/admin/user-management" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">Users</div>
                    <div className="text-sm text-slate-500">Manage users</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-auto py-4 justify-start border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
              >
                <Link href="/admin/reports" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">Reports</div>
                    <div className="text-sm text-slate-500">Generate reports</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-auto py-4 justify-start border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
              >
                <Link href="/flat-rate" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-slate-900">Calculator</div>
                    <div className="text-sm text-slate-500">Flat rate calc</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-slate-400" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
