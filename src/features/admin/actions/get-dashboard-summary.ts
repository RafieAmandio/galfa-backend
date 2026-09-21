"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  vcPerformance,
  mutations,
  accountTypes,
} from "@/db/drizzle/schema";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";

export interface AumRecord {
  date: Date;
  aum: number;
  monthlyGrossRoi: number;
  monthlyNettRoi: number;
}

export interface PrincipleInflow {
  fixRate: number;
  fixRateCount: number;
  floatingRate: number;
  floatingRateCount: number;
  installment: number;
  installmentCount: number;
  total: number;
}

export interface OutflowRecord {
  year: number;
  month: number;
  amount: number;
}

export interface CofRecord {
  year: number;
  month: number;
  cofFixRate: number;
  cumulativeCofFixRate: number;
}

export interface PerformanceRow {
  date: Date;
  year: number;
  month: number;
  totalAum: number;
  principle: number;
  floatingRatePrinciple: number;
  principleCoFOutflow: number;
  cofFixRate: number;
  cofInstallment: number;
  monthlyGrossProfit: number;
  grossProfitForFloatingRate: number;
  grossProfitForFloatingRatePct: number;
  cofFloatingRate: number;
  profitDiambilBangValdo: number;
  realizedPL: number;
  realizedPLPct: number;
}

export interface DashboardSummaryData {
  aumRecords: AumRecord[];
  principleInflow: PrincipleInflow;
  totalCoF: number;
  cofFixRate: number;
  cofFixRateCount: number;
  totalSum: number;
  totalAumRealized: number;
  realizedPL: number;
  realizedPLPct: number;
  cofInstallment: number;
  cofInstallmentCount: number;
  outflowRecords: OutflowRecord[];
  totalOutflow: number;
  performanceRows: PerformanceRow[];
}

export async function getDashboardSummary(): Promise<{
  success: boolean;
  data?: DashboardSummaryData;
  message: string;
}> {
  try {
    await checkAdminAccess();
    const db = createDrizzleConnection();

    // 1. AUM records from vc_performance
    const aumResults = await db
      .select({
        date: vcPerformance.date,
        aum: vcPerformance.aum,
        monthlyGrossRoi: vcPerformance.monthlyGrossRoi,
        monthlyNettRoi: vcPerformance.monthlyNettRoi,
      })
      .from(vcPerformance)
      .orderBy(asc(vcPerformance.date));

    const aumRecords: AumRecord[] = aumResults.map((r) => ({
      date: r.date,
      aum: Number(r.aum),
      monthlyGrossRoi: Number(r.monthlyGrossRoi || 0),
      monthlyNettRoi: Number(r.monthlyNettRoi || 0),
    }));

    // 2. Get account type IDs
    const types = await db
      .select({ id: accountTypes.id, name: accountTypes.name })
      .from(accountTypes);
    const typeMap = Object.fromEntries(types.map((t) => [t.name, t.id]));

    // 3. Principal inflow — sum capital of active accounts by type, net of admin fee
    const activeAccounts = await db
      .select({
        capital: accounts.capital,
        accountTypeId: accounts.account_type_id,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
      })
      .from(accounts)
      .where(eq(accounts.status, "active"));

    let fixRatePrincipal = 0;
    let fixRateCount = 0;
    let floatingRatePrincipal = 0;
    let floatingRateCount = 0;
    let installmentPrincipal = 0;
    let installmentCount = 0;

    for (const acc of activeAccounts) {
      const capital = Number(acc.capital);
      const needsFee =
        !acc.isRollover && !acc.adminFeeApplied
          ? capital * (1 - ADMIN_FEE_PERCENTAGE)
          : capital;
      const net = acc.adminFeeApplied ? capital : needsFee;

      if (acc.accountTypeId === typeMap["fix"]) { fixRatePrincipal += net; fixRateCount++; }
      else if (acc.accountTypeId === typeMap["floating"]) { floatingRatePrincipal += net; floatingRateCount++; }
      else if (acc.accountTypeId === typeMap["installment"]) { installmentPrincipal += net; installmentCount++; }
    }

    const principleInflow: PrincipleInflow = {
      fixRate: fixRatePrincipal,
      fixRateCount,
      floatingRate: floatingRatePrincipal,
      floatingRateCount,
      installment: installmentPrincipal,
      installmentCount,
      total: fixRatePrincipal + floatingRatePrincipal + installmentPrincipal,
    };

    // 4. CoF for fix rate — sum(capital * annual_rate) for active fix accounts
    const fixRateCoFResult = await db
      .select({
        capital: accounts.capital,
        annualRate: fixRateAccounts.annual_rate,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
      })
      .from(fixRateAccounts)
      .innerJoin(accounts, eq(fixRateAccounts.account_id, accounts.id))
      .where(eq(accounts.status, "active"));

    let totalFixRateCoF = 0;
    for (const row of fixRateCoFResult) {
      const capital = Number(row.capital);
      const rate = Number(row.annualRate);
      const net =
        !row.isRollover && !row.adminFeeApplied
          ? capital * (1 - ADMIN_FEE_PERCENTAGE)
          : capital;
      totalFixRateCoF += net * rate;
    }

    // 5. CoF for installment — sum of monthly_cof * capital * period for active installment accounts
    const installmentCoFResult = await db
      .select({
        capital: accounts.capital,
        monthlyCof: installmentAccounts.monthly_cof,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
      })
      .from(installmentAccounts)
      .innerJoin(accounts, eq(installmentAccounts.account_id, accounts.id))
      .where(eq(accounts.status, "active"));

    let cofInstallment = 0;
    for (const row of installmentCoFResult) {
      const capital = Number(row.capital);
      const monthlyRate = Number(row.monthlyCof);
      const net =
        !row.isRollover && !row.adminFeeApplied
          ? capital * (1 - ADMIN_FEE_PERCENTAGE)
          : capital;
      cofInstallment += net * monthlyRate;
    }

    const totalCoF = totalFixRateCoF + cofInstallment;
    const totalSum = principleInflow.total + totalCoF;

    // 6. Outflow — redemptions grouped by month
    const outflowResults = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${mutations.transaction_date})::int`,
        month: sql<number>`EXTRACT(MONTH FROM ${mutations.transaction_date})::int`,
        amount: sql<number>`SUM(${mutations.amount}::numeric)`,
      })
      .from(mutations)
      .where(
        and(
          eq(mutations.type, "redemption"),
          eq(mutations.status, "completed")
        )
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${mutations.transaction_date})`,
        sql`EXTRACT(MONTH FROM ${mutations.transaction_date})`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${mutations.transaction_date})`,
        sql`EXTRACT(MONTH FROM ${mutations.transaction_date})`
      );

    const outflowRecords: OutflowRecord[] = outflowResults.map((r) => ({
      year: r.year,
      month: r.month,
      amount: Number(r.amount),
    }));

    const totalOutflow = outflowRecords.reduce((s, r) => s + r.amount, 0);

    // 7. Latest AUM for realized P/L
    const latestAum =
      aumRecords.length > 0 ? aumRecords[aumRecords.length - 1].aum : 0;
    const realizedPL = latestAum - totalSum;
    const realizedPLPct = totalSum > 0 ? (realizedPL / totalSum) * 100 : 0;

    // 8. Performance table — per month
    const performanceRows: PerformanceRow[] = [];
    for (let i = 0; i < aumRecords.length; i++) {
      const rec = aumRecords[i];
      const prevAum = i > 0 ? aumRecords[i - 1].aum : 0;
      const d = new Date(rec.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const monthlyGrossProfit = rec.aum - prevAum;

      // CoF fix rate for this month: approximate as total fix CoF / 12
      // ponytail: simplified monthly allocation, replace with actual per-month calc if needed
      const monthCofFixRate = totalFixRateCoF / 12;
      const monthCofInstallment = cofInstallment;

      const grossProfitForFloating =
        monthlyGrossProfit - monthCofFixRate - monthCofInstallment;
      const grossProfitForFloatingPct =
        floatingRatePrincipal > 0
          ? (grossProfitForFloating / floatingRatePrincipal) * 100
          : 0;

      const cofFloatingRate =
        floatingRatePrincipal * (rec.monthlyNettRoi / 100);
      const profitValdo = rec.aum * (rec.monthlyGrossRoi / 100) - cofFloatingRate - monthCofFixRate - monthCofInstallment;

      // Find outflow for this month
      const monthOutflow = outflowRecords.find(
        (o) => o.year === year && o.month === month
      );

      // Cumulative realized P/L
      const cumulativeRealizedPL = rec.aum - principleInflow.total - totalCoF;
      const cumulativeRealizedPLPct =
        totalSum > 0 ? (cumulativeRealizedPL / totalSum) * 100 : 0;

      performanceRows.push({
        date: rec.date,
        year,
        month,
        totalAum: rec.aum,
        principle: principleInflow.total,
        floatingRatePrinciple: floatingRatePrincipal,
        principleCoFOutflow: monthOutflow?.amount || 0,
        cofFixRate: monthCofFixRate,
        cofInstallment: monthCofInstallment,
        monthlyGrossProfit,
        grossProfitForFloatingRate: grossProfitForFloating,
        grossProfitForFloatingRatePct: grossProfitForFloatingPct,
        cofFloatingRate,
        profitDiambilBangValdo: Math.max(0, profitValdo),
        realizedPL: cumulativeRealizedPL,
        realizedPLPct: cumulativeRealizedPLPct,
      });
    }

    return {
      success: true,
      message: "Dashboard summary loaded",
      data: {
        aumRecords,
        principleInflow,
        totalCoF,
        cofFixRate: totalFixRateCoF,
        cofFixRateCount: fixRateCoFResult.length,
        totalSum,
        totalAumRealized: latestAum,
        realizedPL,
        realizedPLPct,
        cofInstallment,
        cofInstallmentCount: installmentCoFResult.length,
        outflowRecords,
        totalOutflow,
        performanceRows,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to load dashboard summary",
    };
  }
}
