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
  monthlyGrossRoi?: number | null;
  monthlyNettRoi?: number | null;
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

const fc = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const fcc = (amount: number) => {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(0)}M`;
  return fc(amount);
};

const fp = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "none",
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  padding: "12px 16px",
};

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
    try { await supabase.auth.signOut(); } catch {} finally { setIsSigningOut(false); }
  };

  const performanceData = (vcPerformance || []).map((r) => {
    const d = new Date(r.date);
    return {
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      aum: r.aum,
      grossRoi: r.monthlyGrossRoi ?? 0,
      nettRoi: r.monthlyNettRoi ?? 0,
    };
  });

  const portfolioAllocation = (() => {
    if (!summary) return [];
    const data: { name: string; value: number; color: string }[] = [];
    if (summary.flatRateInvestments.hasData)
      data.push({ name: "Flat Rate", value: summary.flatRateInvestments.totalNetInvestedFund, color: "#192473" });
    if (summary.floatingRateInvestments.hasData)
      data.push({ name: "Floating Rate", value: summary.floatingRateInvestments.totalNetCapital, color: "#10b981" });
    if (summary.installmentInvestments.hasData)
      data.push({ name: "Installment", value: summary.installmentInvestments.totalNetInvestorFund, color: "#f59e0b" });
    return data;
  })();

  const totalPortfolio = summary ? summary.totalNetPresentValue : 0;

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800 mb-1">Unable to Load Portfolio</p>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button onClick={() => router.refresh()} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* No Data */}
      {!summary && !error && (
        <div className="rounded-2xl bg-white border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Active Investments</h3>
          <p className="text-muted-foreground text-sm">Contact your advisor to get started.</p>
        </div>
      )}

      {summary && (
        <>
          {/* ──── Hero Card ──── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#192473] via-[#1e2d8a] to-[#253699] p-8 text-white">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#FFEB7A]/10" />
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-white/60 tracking-wide uppercase">Total Portfolio Value</p>
                  <p className="text-4xl font-bold mt-1 tracking-tight">{fc(totalPortfolio)}</p>
                </div>
                <DownloadPdfButton email={user.email} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" />
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-white/50">Total Invested</p>
                  <p className="text-lg font-semibold">{fc(summary.totalNetInvestedFund)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Total Returns</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-semibold ${summary.totalGainLoss >= 0 ? "text-[#FFEB7A]" : "text-red-300"}`}>
                      {fc(summary.totalGainLoss)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${summary.totalGainLoss >= 0 ? "bg-[#FFEB7A]/20 text-[#FFEB7A]" : "bg-red-400/20 text-red-300"}`}>
                      {fp(summary.totalGainLossPercentage)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/50">Active Accounts</p>
                  <p className="text-lg font-semibold">{summary.activeInvestments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ──── KPI Row ──── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Flat Rate */}
            <Link href="/investor/flat-rate" className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#192473]/20 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#192473]/8 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-[#192473]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Flat Rate</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {summary.flatRateInvestments.hasData ? fc(summary.flatRateInvestments.totalNetInvestedFund) : "—"}
                  </p>
                </div>
                {summary.flatRateInvestments.hasData && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${summary.flatRateInvestments.totalGainLoss >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {fp(summary.flatRateInvestments.totalGainLossPercentage)}
                  </span>
                )}
              </div>
              {summary.flatRateInvestments.hasData && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Current: {fc(summary.flatRateInvestments.totalNetPresentValue)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-[#192473] group-hover:translate-x-0.5 transition-all" />
                </div>
              )}
            </Link>

            {/* Floating Rate */}
            <Link href="/investor/floating-rate" className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Floating Rate</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {summary.floatingRateInvestments.hasData ? fc(summary.floatingRateInvestments.totalNetCapital) : "—"}
                  </p>
                </div>
                {summary.floatingRateInvestments.hasData && summary.floatingRateInvestments.totalGainedFund !== 0 && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${summary.floatingRateInvestments.totalGainedFund >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {fcc(summary.floatingRateInvestments.totalGainedFund)}
                  </span>
                )}
              </div>
              {summary.floatingRateInvestments.hasData && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{summary.floatingRateInvestments.activeInvestments} active</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              )}
            </Link>

            {/* Installment */}
            <Link href="/investor/installments" className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Installment</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {summary.installmentInvestments.hasData ? fc(summary.installmentInvestments.totalNetInvestorFund) : "—"}
                  </p>
                </div>
                {summary.installmentInvestments.hasData && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-600">
                    {summary.installmentInvestments.activeInvestments} active
                  </span>
                )}
              </div>
              {summary.installmentInvestments.hasData && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Redeemed: {fc(summary.installmentInvestments.totalRedeemedAmount)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              )}
            </Link>
          </div>

          {/* ──── Charts Row ──── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AUM Performance (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Company AUM</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Assets Under Management</p>
                </div>
                {fundAllocations && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-lg font-bold text-[#192473]">{fcc(fundAllocations.totalAum)}</p>
                  </div>
                )}
              </div>
              {performanceData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aumGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#192473" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#192473" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={fcc} width={70} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fc(v), "AUM"]} />
                      <Area type="monotone" dataKey="aum" stroke="#192473" strokeWidth={2.5} fill="url(#aumGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data available</div>
              )}
            </div>

            {/* Portfolio Allocation (1/3 width) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-foreground mb-1">Portfolio Allocation</h3>
              <p className="text-xs text-muted-foreground mb-4">By investment type</p>
              {portfolioAllocation.length > 0 ? (
                <>
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={portfolioAllocation} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {portfolioAllocation.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fc(v), ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-foreground">{fcc(totalPortfolio)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5 mt-2">
                    {portfolioAllocation.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{fcc(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No allocation data</div>
              )}
            </div>
          </div>

          {/* ──── Investment Performance (ROI Chart) ──── */}
          {performanceData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-foreground">Investment Performance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly Gross &amp; Net ROI</p>
                </div>
                <div className="flex gap-5">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gross ROI</p>
                    <p className="text-xl font-bold text-[#192473]">{performanceData[performanceData.length - 1].grossRoi.toFixed(2)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net ROI</p>
                    <p className="text-xl font-bold text-emerald-600">{performanceData[performanceData.length - 1].nettRoi.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData.slice(-12)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n === "grossRoi" ? "Gross ROI" : "Net ROI"]} />
                    <Bar dataKey="grossRoi" fill="#192473" radius={[6, 6, 0, 0]} barSize={14} name="grossRoi" />
                    <Bar dataKey="nettRoi" fill="#10b981" radius={[6, 6, 0, 0]} barSize={14} name="nettRoi" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#192473]" /><span className="text-xs text-muted-foreground">Gross ROI</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-xs text-muted-foreground">Net ROI (Investor)</span></div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                Galfa targets &gt;20% gross profit p.a. — &gt;10% net profit for investors.
              </p>
            </div>
          )}

          {/* ──── Fund Allocations ──── */}
          {fundAllocations && fundAllocations.allocations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#192473]/8 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#192473]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Galfa Fund II Allocations</h3>
                      <p className="text-xs text-muted-foreground">{fundAllocations.totalAllocations} portfolio companies</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total AUM</p>
                    <p className="text-lg font-bold text-[#192473]">{fcc(fundAllocations.totalAum)}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {fundAllocations.allocations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-sm text-foreground truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{a.description || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{fcc(a.aum)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.rate_label || `${a.rate_type === "loan" ? "Loan" : "ROE"}: ${a.rate_value}%`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
