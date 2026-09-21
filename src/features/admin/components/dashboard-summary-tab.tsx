"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/features/admin/actions/get-dashboard-summary";
import type {
  DashboardSummaryData,
  AumRecord,
  PerformanceRow,
} from "@/features/admin/actions/get-dashboard-summary";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

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

function DetailRow({
  label,
  formula,
}: {
  label: string;
  formula: string;
}) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-muted-foreground/70">
      <span className="shrink-0 font-medium">{label}:</span>
      <span className="font-mono">{formula}</span>
    </div>
  );
}

function CollapsibleDetail({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
      >
        <Info className="w-3 h-3" />
        <span>How is this calculated?</span>
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-1 bg-muted/30 rounded-lg p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function SummaryKPIs({ data }: { data: DashboardSummaryData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-4">
        {/* Principle + CoF + Sum */}
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
          <CollapsibleDetail>
            <DetailRow
              label="Principle"
              formula={`SUM of all active account capitals (net of 5% admin fee for non-rollovers)`}
            />
            <DetailRow
              label="→ Fix Rate"
              formula={`${data.principleInflow.fixRateCount} accounts → ${fmtCurrency(data.principleInflow.fixRate)}`}
            />
            <DetailRow
              label="→ Floating"
              formula={`${data.principleInflow.floatingRateCount} accounts → ${fmtCurrency(data.principleInflow.floatingRate)}`}
            />
            <DetailRow
              label="→ Installment"
              formula={`${data.principleInflow.installmentCount} accounts → ${fmtCurrency(data.principleInflow.installment)}`}
            />
            <DetailRow
              label="CoF"
              formula={`CoF Fix Rate + CoF Installment = ${fmtCurrency(data.cofFixRate)} + ${fmtCurrency(data.cofInstallment)} = ${fmtCurrency(data.totalCoF)}`}
            />
            <DetailRow
              label="CoF Fix Rate"
              formula={`SUM(net_capital × annual_rate) across ${data.cofFixRateCount} active fix accounts`}
            />
            <DetailRow
              label="CoF Installment"
              formula={`SUM(net_capital × monthly_cof_rate) across ${data.cofInstallmentCount} active installment accounts`}
            />
            <DetailRow
              label="Sum"
              formula={`Principle + CoF = ${fmtCurrency(data.principleInflow.total)} + ${fmtCurrency(data.totalCoF)}`}
            />
          </CollapsibleDetail>
        </div>

        {/* Total AUM + Realized P/L */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Total AUM
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">W/ Realized</span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.totalAumRealized)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Realized P/L</span>
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
          <CollapsibleDetail>
            <DetailRow
              label="AUM (W/ Realized)"
              formula={`Latest entry from vc_performance table (manual input from Pak Valdo)`}
            />
            <DetailRow
              label="Latest date"
              formula={`${data.aumRecords.length > 0 ? format(new Date(data.aumRecords[data.aumRecords.length - 1].date), "dd MMM yyyy") : "-"}`}
            />
            <DetailRow
              label="Realized P/L"
              formula={`AUM - Sum = ${fmtCurrency(data.totalAumRealized)} - ${fmtCurrency(data.totalSum)} = ${fmtCurrency(data.realizedPL)}`}
            />
            <DetailRow
              label="Realized P/L %"
              formula={`Realized P/L ÷ Sum × 100 = ${fmtCurrency(data.realizedPL)} ÷ ${fmtCurrency(data.totalSum)} × 100 = ${fmtPct(data.realizedPLPct)}`}
            />
          </CollapsibleDetail>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Principle Inflow */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Updated Principle Inflow (As of Now)
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Fix Rate
                <span className="text-xs ml-1">({data.principleInflow.fixRateCount})</span>
              </span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.principleInflow.fixRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Floating Rate
                <span className="text-xs ml-1">({data.principleInflow.floatingRateCount})</span>
              </span>
              <span className="text-sm font-medium">
                {fmtCurrency(data.principleInflow.floatingRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Installment
                <span className="text-xs ml-1">({data.principleInflow.installmentCount})</span>
              </span>
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
          <CollapsibleDetail>
            <DetailRow
              label="Source"
              formula={`accounts table WHERE status = 'active', grouped by account_type`}
            />
            <DetailRow
              label="Net capital"
              formula={`capital × (1 - 5% admin fee) for non-rollovers; capital as-is for rollovers`}
            />
            <DetailRow
              label="Fix Rate"
              formula={`${data.principleInflow.fixRateCount} active fix accounts → SUM(net_capital) = ${fmtCurrency(data.principleInflow.fixRate)}`}
            />
            <DetailRow
              label="Floating"
              formula={`${data.principleInflow.floatingRateCount} active floating accounts → SUM(net_capital) = ${fmtCurrency(data.principleInflow.floatingRate)}`}
            />
            <DetailRow
              label="Installment"
              formula={`${data.principleInflow.installmentCount} active installment accounts → SUM(net_capital) = ${fmtCurrency(data.principleInflow.installment)}`}
            />
          </CollapsibleDetail>
        </div>

        {/* CoF Installment */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            CoF Installment (As of Now)
          </h3>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">CoF Installment</span>
            <span className="text-sm font-medium">
              {fmtCurrency(data.cofInstallment)}
            </span>
          </div>
          <CollapsibleDetail>
            <DetailRow
              label="Source"
              formula={`${data.cofInstallmentCount} active installment accounts`}
            />
            <DetailRow
              label="Formula"
              formula={`SUM(net_capital × monthly_cof_rate) for each active installment account`}
            />
            <DetailRow
              label="Note"
              formula={`This is the monthly CoF obligation to installment investors`}
            />
          </CollapsibleDetail>
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
          <CollapsibleDetail>
            <DetailRow
              label="Source"
              formula={`mutations table WHERE type = 'redemption' AND status = 'completed'`}
            />
            <DetailRow
              label="Grouping"
              formula={`SUM(amount) grouped by YEAR(transaction_date), MONTH(transaction_date)`}
            />
            <DetailRow
              label="Total"
              formula={`SUM of all monthly outflows = ${fmtCurrency(data.totalOutflow)}`}
            />
          </CollapsibleDetail>
        </div>
      </div>
    </div>
  );
}

function AumTable({ records }: { records: AumRecord[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            AUM Table Record
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Source: <span className="font-mono">vc_performance</span> table — manually input from Pak Valdo
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {records.length} months
        </span>
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

function PerformanceTable({
  rows,
  data,
}: {
  rows: PerformanceRow[];
  data: DashboardSummaryData;
}) {
  const [showFormulas, setShowFormulas] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Performance Table
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              W/ Realized — monthly breakdown
            </p>
          </div>
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors bg-muted/50 px-2.5 py-1.5 rounded-lg"
          >
            <Info className="w-3 h-3" />
            {showFormulas ? "Hide formulas" : "Show formulas"}
          </button>
        </div>
        {showFormulas && (
          <div className="mt-3 bg-muted/30 rounded-lg p-3 space-y-1">
            <DetailRow
              label="Total AUM"
              formula="From vc_performance table (manual input)"
            />
            <DetailRow
              label="Outflow"
              formula="SUM(mutations.amount) WHERE type='redemption' for that month"
            />
            <DetailRow
              label="CoF Fix Rate"
              formula={`SUM(net_capital × annual_rate) ÷ 12 = ${fmtCurrency(data.cofFixRate)} ÷ 12 per month`}
            />
            <DetailRow
              label="CoF Installment"
              formula={`SUM(net_capital × monthly_cof_rate) = ${fmtCurrency(data.cofInstallment)} per month`}
            />
            <DetailRow
              label="Monthly Gross Profit"
              formula="AUM[current month] − AUM[previous month]"
            />
            <DetailRow
              label="Gross Profit Floating"
              formula="Monthly Gross Profit − CoF Fix Rate − CoF Installment"
            />
            <DetailRow
              label="In %"
              formula={`Gross Profit Floating ÷ Floating Rate Principle (${fmtCurrency(data.principleInflow.floatingRate)}) × 100`}
            />
            <DetailRow
              label="CoF Floating Rate"
              formula={`Floating Rate Principle (${fmtCurrency(data.principleInflow.floatingRate)}) × Monthly Nett ROI%`}
            />
            <DetailRow
              label="Realized P/L"
              formula="AUM − Total Principle − Total CoF"
            />
            <DetailRow
              label="Realized P/L %"
              formula={`Realized P/L ÷ Sum (${fmtCurrency(data.totalSum)}) × 100`}
            />
          </div>
        )}
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
      <PerformanceTable rows={data.performanceRows} data={data} />
    </div>
  );
}
