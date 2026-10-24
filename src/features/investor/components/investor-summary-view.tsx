"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/db/supabase/browser";
import type { ComprehensiveInvestorSummary } from "@/features/investor/actions/get-comprehensive-summary";
import type { FundAllocation } from "@/features/fund-allocations/actions/get-fund-allocations";
import { DownloadPdfButton } from "@/features/reports/components/download-pdf-button";
import Link from "next/link";
import { AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
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
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  padding: "8px 12px",
  fontSize: "12px",
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
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Unable to load portfolio</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
            <button onClick={() => router.refresh()} className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-red-700 hover:text-red-800">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      )}

      {!summary && !error && (
        <div className="rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="w-6 h-6 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No active investments</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your advisor to get started.</p>
        </div>
      )}

      {summary && (
        <>
          {/* Hero */}
          <div className="rounded-lg bg-[#192473] p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/60">Total Portfolio Value</p>
                <p className="text-3xl font-bold mt-1 tabular-nums tracking-tight">{fc(totalPortfolio)}</p>
              </div>
              <DownloadPdfButton email={user.email} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" />
            </div>
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-white/50">Invested</p>
                <p className="text-sm font-medium tabular-nums">{fc(summary.totalNetInvestedFund)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Returns</p>
                <p className={`text-sm font-medium tabular-nums ${summary.totalGainLoss >= 0 ? "text-[#FFEB7A]" : "text-red-300"}`}>
                  {fc(summary.totalGainLoss)} ({fp(summary.totalGainLossPercentage)})
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50">Active</p>
                <p className="text-sm font-medium tabular-nums">{summary.activeInvestments}</p>
              </div>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-200 rounded-lg overflow-hidden">
            <Link href="/investor/flat-rate" className="bg-white p-4 hover:bg-gray-50 transition-colors">
              <p className="text-xs text-muted-foreground">Flat Rate</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {summary.flatRateInvestments.hasData ? fc(summary.flatRateInvestments.totalNetInvestedFund) : "—"}
              </p>
              {summary.flatRateInvestments.hasData && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current {fc(summary.flatRateInvestments.totalNetPresentValue)}
                  <span className={` ml-1 ${summary.flatRateInvestments.totalGainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {fp(summary.flatRateInvestments.totalGainLossPercentage)}
                  </span>
                </p>
              )}
            </Link>
            <Link href="/investor/floating-rate" className="bg-white p-4 hover:bg-gray-50 transition-colors">
              <p className="text-xs text-muted-foreground">Floating Rate</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {summary.floatingRateInvestments.hasData ? fc(summary.floatingRateInvestments.totalNetCapital) : "—"}
              </p>
              {summary.floatingRateInvestments.hasData && (
                <p className="text-xs text-muted-foreground mt-1">
                  Gain {fcc(summary.floatingRateInvestments.totalGainedFund)} · {summary.floatingRateInvestments.activeInvestments} active
                </p>
              )}
            </Link>
            <Link href="/investor/installments" className="bg-white p-4 hover:bg-gray-50 transition-colors">
              <p className="text-xs text-muted-foreground">Installment</p>
              <p className="text-lg font-semibold tabular-nums mt-0.5">
                {summary.installmentInvestments.hasData ? fc(summary.installmentInvestments.totalNetInvestorFund) : "—"}
              </p>
              {summary.installmentInvestments.hasData && (
                <p className="text-xs text-muted-foreground mt-1">
                  Redeemed {fc(summary.installmentInvestments.totalRedeemedAmount)} · {summary.installmentInvestments.activeInvestments} active
                </p>
              )}
            </Link>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">Company AUM</h3>
                {fundAllocations && (
                  <p className="text-sm font-semibold tabular-nums text-[#192473]">{fcc(fundAllocations.totalAum)}</p>
                )}
              </div>
              {performanceData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={fcc} width={70} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fc(v), "AUM"]} />
                      <Area type="monotone" dataKey="aum" stroke="#192473" strokeWidth={2} fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data available</div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Portfolio Allocation</h3>
              {portfolioAllocation.length > 0 ? (
                <>
                  <div className="h-44 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={portfolioAllocation} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
                          {portfolioAllocation.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fc(v), ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-sm font-semibold tabular-nums">{fcc(totalPortfolio)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    {portfolioAllocation.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium tabular-nums">{fcc(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No allocation data</div>
              )}
            </div>
          </div>

          {/* ROI Chart */}
          {performanceData.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">Monthly ROI</h3>
                <div className="flex gap-4 text-sm tabular-nums">
                  <span className="text-[#192473] font-medium">{performanceData[performanceData.length - 1].grossRoi.toFixed(2)}% gross</span>
                  <span className="text-emerald-600 font-medium">{performanceData[performanceData.length - 1].nettRoi.toFixed(2)}% net</span>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData.slice(-12)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n === "grossRoi" ? "Gross" : "Net"]} />
                    <Bar dataKey="grossRoi" fill="#192473" radius={[3, 3, 0, 0]} barSize={12} name="grossRoi" />
                    <Bar dataKey="nettRoi" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} name="nettRoi" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-sm bg-[#192473]" />Gross ROI</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />Net ROI</span>
                <span className="ml-auto">Target: &gt;20% gross p.a., &gt;10% net</span>
              </div>
            </div>
          )}

          {/* Fund Allocations */}
          {fundAllocations && fundAllocations.allocations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Galfa Fund II Allocations</h3>
                  <p className="text-xs text-muted-foreground">{fundAllocations.totalAllocations} portfolio companies</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-[#192473]">{fcc(fundAllocations.totalAum)}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {fundAllocations.allocations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm text-foreground truncate">{a.name}</p>
                      {a.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{a.description}</p>}
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-medium">{fcc(a.aum)}</p>
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
