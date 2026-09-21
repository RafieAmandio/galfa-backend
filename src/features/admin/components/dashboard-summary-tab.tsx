"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/features/admin/actions/get-dashboard-summary";
import type {
  DashboardSummaryData,
  AumRecord,
  OutflowRecord,
  PerformanceRow,
} from "@/features/admin/actions/get-dashboard-summary";
import { format } from "date-fns";

const fmtCurrency = (n: number) =>
  `Rp${Math.round(n).toLocaleString("id-ID")}`;

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

const months = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function SummaryKPIs({ data }: { data: DashboardSummaryData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Principle + CoF + Sum */}
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Summary (As of Now)
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Principle</span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.principleInflow.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CoF</span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.totalCoF)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-sm font-semibold">Sum</span>
              <span className="text-sm font-semibold">
                {fmtCurrency(data.totalSum)}
              </span>
            </div>
          </div>
        </div>

        {/* Total AUM + Realized P/L */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Total AUM
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                W/ Realized
              </span>
              <div className="text-right">
                <span className="text-sm font-medium">
                  {fmtCurrency(data.totalAumRealized)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Realized P/L
              </span>
              <div className="text-right flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${data.realizedPL >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {fmtCurrency(data.realizedPL)}
                </span>
                <span
                  className={`text-xs ${data.realizedPL >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {fmtPct(data.realizedPLPct)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Principle Inflow + CoF Installment + Outflow */}
      <div className="space-y-4">
        {/* Principle Inflow */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Updated Principle Inflow (As of Now)
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fix Rate</span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.principleInflow.fixRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Floating Rate
              </span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.principleInflow.floatingRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Installment</span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.principleInflow.installment)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-sm font-semibold">Total principle</span>
              <span className="text-sm font-semibold">
                {fmtCurrency(data.principleInflow.total)}
              </span>
            </div>
          </div>
        </div>

        {/* CoF Installment */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            CoF Installment (As of Now)
          </h3>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              CoF Installment
            </span>
            <span className="text-sm font-medium">
              {fmtCurrency(data.cofInstallment)}
            </span>
          </div>
        </div>

        {/* Outflow */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Principle + CoF Outflow
          </h3>
          <div className="flex justify-between mb-2 border-b border-border pb-2">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-semibold text-red-600">
              {fmtCurrency(data.totalOutflow)}
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {data.outflowRecords.map((r) => (
              <div
                key={`${r.year}-${r.month}`}
                className="flex justify-between text-xs"
              >
                <span className="text-muted-foreground">
                  {r.year} · {months[r.month]}
                </span>
                <span>{fmtCurrency(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AumTable({ records }: { records: AumRecord[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          AUM Table Record
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Period
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                AUM
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Monthly ROI (Gross)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Monthly ROI (Investor Nett)
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-3 py-2 font-medium">
                  {format(new Date(r.date), "MMMM yyyy")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtCurrency(r.aum)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPct(r.monthlyGrossRoi)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPct(r.monthlyNettRoi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceTable({ rows }: { rows: PerformanceRow[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Performance Table
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          W/ Realized — monthly breakdown
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10">
                Period
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Total AUM
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Outflow
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                CoF Fix Rate
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                CoF Installment
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Monthly Gross Profit
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Gross Profit Floating
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                In %
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                CoF Floating Rate
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Realized P/L
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                In %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-3 py-2 font-medium sticky left-0 bg-card z-10">
                  {format(new Date(r.date), "MMM yyyy")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtCurrency(r.totalAum)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-red-600">
                  {r.principleCoFOutflow > 0
                    ? fmtCurrency(r.principleCoFOutflow)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtCurrency(r.cofFixRate)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtCurrency(r.cofInstallment)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${r.monthlyGrossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {fmtCurrency(r.monthlyGrossProfit)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${r.grossProfitForFloatingRate >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {fmtCurrency(r.grossProfitForFloatingRate)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${r.grossProfitForFloatingRatePct >= 0 ? "" : "text-red-600"}`}
                >
                  {fmtPct(r.grossProfitForFloatingRatePct)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtCurrency(r.cofFloatingRate)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${r.realizedPL >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {fmtCurrency(r.realizedPL)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${r.realizedPLPct >= 0 ? "" : "text-red-600"}`}
                >
                  {fmtPct(r.realizedPLPct)}
                </td>
              </tr>
            ))}
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
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 bg-muted/50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!result?.success || !result.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {result?.message || "Failed to load dashboard summary"}
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="space-y-6">
      <SummaryKPIs data={data} />
      <AumTable records={data.aumRecords} />
      <PerformanceTable rows={data.performanceRows} />
    </div>
  );
}
