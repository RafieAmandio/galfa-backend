"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/features/admin/actions/get-dashboard-summary";
import type { DashboardSummaryData } from "@/features/admin/actions/get-dashboard-summary";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

const fc = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const fp = (n: number) => `${n.toFixed(2)}%`;
const MN = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Detail({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-muted-foreground/70">
      <span className="shrink-0 font-medium">{label}:</span>
      <span className="font-mono">{formula}</span>
    </div>
  );
}

function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary">
        <Info className="w-3 h-3" />
        <span>How is this calculated?</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="mt-2 space-y-1 bg-muted/30 rounded-lg p-3">{children}</div>}
    </div>
  );
}

function SummaryCards({ d }: { d: DashboardSummaryData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Principle + CoF + Sum */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Summary</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="text-muted-foreground py-0.5">Principle</td><td className="text-right font-medium">{fc(d.totalPrinciple)}</td></tr>
              <tr><td className="text-muted-foreground py-0.5">CoF</td><td className="text-right font-medium">{fc(d.totalCoF)}</td></tr>
              <tr className="border-t border-border"><td className="font-semibold pt-1">Sum</td><td className="text-right font-semibold pt-1">{fc(d.totalSum)}</td></tr>
            </tbody>
          </table>
        </div>
        {/* Total AUM */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Total AUM</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground"><th></th><th className="text-right">Total AUM</th><th className="text-right">Realized P/L</th><th className="text-right"></th></tr></thead>
            <tbody>
              <tr>
                <td className="text-muted-foreground py-1">W/ Realized</td>
                <td className="text-right font-medium">{fc(d.totalAumRealized)}</td>
                <td className={`text-right font-medium ${d.realizedPL >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fc(d.realizedPL)}</td>
                <td className={`text-right text-xs ${d.realizedPL >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fp(d.realizedPLPct)}</td>
              </tr>
              <tr>
                <td className="text-muted-foreground py-1">w/ Realized + Float</td>
                <td className="text-right font-medium">{fc(d.totalAumRealizedPlusFloat)}</td>
                <td className={`text-right font-medium ${d.realizedPLPlusFloat >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fc(d.realizedPLPlusFloat)}</td>
                <td className={`text-right text-xs ${d.realizedPLPlusFloat >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fp(d.realizedPLPlusFloatPct)}</td>
              </tr>
            </tbody>
          </table>
          <Collapsible>
            <Detail label="W/ Realized" formula="Latest AUM from vc_performance (manual input from Pak Valdo)" />
            <Detail label="Realized P/L" formula={`AUM − Sum = ${fc(d.totalAumRealized)} − ${fc(d.totalSum)}`} />
          </Collapsible>
        </div>
      </div>

      <div className="space-y-4">
        {/* Principle Inflow */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Updated Principle Inflow (As of Now)</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground"><th className="text-left">Principle</th><th className="text-right">Principle Inflow</th></tr></thead>
            <tbody>
              <tr><td className="text-muted-foreground py-0.5">Fix Rate <span className="text-xs">({d.principleInflow.fixRateCount})</span></td><td className="text-right font-medium">{fc(d.principleInflow.fixRate)}</td></tr>
              <tr><td className="text-muted-foreground py-0.5">Floating Rate <span className="text-xs">({d.principleInflow.floatingRateCount})</span></td><td className="text-right font-medium">{fc(d.principleInflow.floatingRate)}</td></tr>
              <tr><td className="text-muted-foreground py-0.5">Installment <span className="text-xs">({d.principleInflow.installmentCount})</span></td><td className="text-right font-medium">{fc(d.principleInflow.installment)}</td></tr>
              <tr className="border-t border-border"><td className="font-semibold pt-1">Total principle</td><td className="text-right font-semibold pt-1">{fc(d.principleInflow.total)}</td></tr>
            </tbody>
          </table>
          <Collapsible>
            <Detail label="Source" formula="SUM(net_capital) of active accounts, grouped by type" />
            <Detail label="Net capital" formula="capital × (1 − 5% admin fee) for non-rollovers" />
          </Collapsible>
        </div>
        {/* CoF Installment */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">CoF Installment (As of Now)</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">CoF Installment</span>
            <span className="font-medium">{fc(d.cofInstallment)}</span>
          </div>
        </div>
        {/* Outflow */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Principle + CoF Outflow</h3>
          <div className="flex justify-between text-sm mb-2 border-b border-border pb-2">
            <span className="font-semibold">Principle + CoF Outflow</span>
            <span className="font-semibold text-red-600">{fc(d.totalOutflow)}</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {d.outflowRecords.map((r) => (
              <div key={`${r.year}-${r.month}`} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{r.year} · {MN[r.month]}</span>
                <span>{fc(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CofTable({ rows }: { rows: DashboardSummaryData["cofTableRows"] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">CoF Table Record</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          CoF values based on current active accounts — historical months reflect current portfolio, not point-in-time
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Year</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Month</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">CoF Fix Rate</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cumulative CoF Fix Rate</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">CoF Floating Rate</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cumulative CoF Floating Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-3 py-1.5">{r.year}</td>
                <td className="px-3 py-1.5">{MN[r.month]}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fc(r.cofFixRate)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fc(r.cumulativeCofFixRate)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{r.cofFloatingRate ? fc(r.cofFloatingRate) : ""}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{r.cumulativeCofFloatingRate ? fc(r.cumulativeCofFloatingRate) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AumTable({ rows }: { rows: DashboardSummaryData["aumTableRows"] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">AUM Table Record</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            KETERANGAN: Cells yang boleh diedit manual dan update setiap bulan
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{rows.length} months</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Year</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Month</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">W/ Realized — Total AUM</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">w/ Realized + Float — Total AUM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const d = new Date(r.date);
              return (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5">{r.year}</td>
                  <td className="px-3 py-1.5">{MN[r.month]}</td>
                  <td className="px-3 py-1.5">{d.getDate()} {MN[r.month]?.slice(0, 3)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fc(r.aumRealized)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fc(r.aumRealizedPlusFloat)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceTable({ rows, d }: { rows: DashboardSummaryData["performanceRows"]; d: DashboardSummaryData }) {
  const [showFormulas, setShowFormulas] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Performance Table</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">W/ Realized</p>
          </div>
          <button onClick={() => setShowFormulas(!showFormulas)}
            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary bg-muted/50 px-2.5 py-1.5 rounded-lg">
            <Info className="w-3 h-3" />
            {showFormulas ? "Hide formulas" : "Show formulas"}
          </button>
        </div>
        {showFormulas && (
          <div className="mt-3 bg-muted/30 rounded-lg p-3 space-y-1">
            <Detail label="Total AUM" formula="From vc_performance table (manual input)" />
            <Detail label="Principle" formula={`Fix Rate + Floating + Installment = ${fc(d.totalPrinciple)}`} />
            <Detail label="Floating Rate Principle" formula={fc(d.principleInflow.floatingRate)} />
            <Detail label="Outflow" formula="SUM(mutations.amount) WHERE type='redemption' for that month" />
            <Detail label="CoF Fix Rate" formula={`Annual CoF (${fc(d.cofFixRateAnnual)}) ÷ 12 = ${fc(d.cofFixRateAnnual / 12)} per month`} />
            <Detail label="CoF Installment" formula={`SUM(net_capital × monthly_cof) = ${fc(d.cofInstallment)} per month`} />
            <Detail label="Monthly Gross Profit" formula="AUM[current] − AUM[previous]" />
            <Detail label="Gross Profit Floating" formula="Monthly Gross Profit − CoF Fix Rate − CoF Installment" />
            <Detail label="In %" formula={`Gross Profit Floating ÷ Floating Rate Principle (${fc(d.principleInflow.floatingRate)}) × 100`} />
            <Detail label="CoF Floating Rate" formula={`Floating Rate Principle × Monthly Nett ROI%`} />
            <Detail label="Profit Diambil Bang Valdo" formula="AUM × Gross ROI% − CoF Floating − CoF Fix − CoF Installment" />
            <Detail label="Realized P/L" formula={`AUM − Principle (${fc(d.totalPrinciple)}) − CoF (${fc(d.totalCoF)})`} />
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[60px]">Month</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Total AUM</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Principle</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Floating Rate Principle</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Outflow</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">CoF Fix Rate</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">CoF Installment</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Monthly Gross Profit</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Gross Profit for Floating Rate</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">In %</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">CoF Floating Rate</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Profit Diambil Bang Valdo</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">Realized P/L</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground">in %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const neg = (v: number) => v < 0 ? "text-red-600" : "";
              const pos = (v: number) => v >= 0 ? "text-emerald-600" : "text-red-600";
              return (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-2 py-1.5 font-medium sticky left-0 bg-card z-10">{r.month}/{r.year}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.totalAum)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.principle)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.floatingRatePrinciple)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${r.principleCoFOutflow > 0 ? "text-red-600" : ""}`}>
                    {r.principleCoFOutflow > 0 ? fc(r.principleCoFOutflow) : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.cofFixRate)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.cofInstallment)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${pos(r.monthlyGrossProfit)}`}>{fc(r.monthlyGrossProfit)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${pos(r.grossProfitForFloatingRate)}`}>{fc(r.grossProfitForFloatingRate)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${neg(r.grossProfitForFloatingRatePct)}`}>{fp(r.grossProfitForFloatingRatePct)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.cofFloatingRate)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fc(r.profitDiambilBangValdo)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${pos(r.realizedPL)}`}>{fc(r.realizedPL)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${neg(r.realizedPLPct)}`}>{fp(r.realizedPLPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardSummaryTab() {
  const { data: result, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getDashboardSummary(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!result?.success || !result.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {result?.message || "Failed to load"}
      </div>
    );
  }

  const d = result.data;

  return (
    <div className="space-y-6">
      <SummaryCards d={d} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CofTable rows={d.cofTableRows} />
        <AumTable rows={d.aumTableRows} />
      </div>
      <PerformanceTable rows={d.performanceRows} d={d} />
    </div>
  );
}
