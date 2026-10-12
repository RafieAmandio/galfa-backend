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
import { eq, and, sql, asc } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";

export interface CofTableRow {
  year: number;
  month: number;
  cofFixRate: number;
  cumulativeCofFixRate: number;
  cofFloatingRate: number;
  cumulativeCofFloatingRate: number;
}

export interface AumTableRow {
  year: number;
  month: number;
  date: Date;
  aumRealized: number;
  aumRealizedPlusFloat: number;
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

export interface PerformanceRow {
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
  cofTableRows: CofTableRow[];
  aumTableRows: AumTableRow[];
  principleInflow: PrincipleInflow;
  totalPrinciple: number;
  totalCoF: number;
  cofFixRateAnnual: number;
  cofFixRateCount: number;
  totalSum: number;
  totalAumRealized: number;
  realizedPL: number;
  realizedPLPct: number;
  totalAumRealizedPlusFloat: number;
  realizedPLPlusFloat: number;
  realizedPLPlusFloatPct: number;
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
        profitTaken: vcPerformance.profitTaken,
        monthlyGrossRoi: vcPerformance.monthlyGrossRoi,
        monthlyNettRoi: vcPerformance.monthlyNettRoi,
      })
      .from(vcPerformance)
      .orderBy(asc(vcPerformance.date));

    const aumRecords = aumResults.map((r) => ({
      date: r.date,
      aum: Number(r.aum),
      profitTaken: Number(r.profitTaken || 0),
      monthlyGrossRoi: Number(r.monthlyGrossRoi || 0),
      monthlyNettRoi: Number(r.monthlyNettRoi || 0),
    }));

    // 2. Get account type IDs
    const types = await db
      .select({ id: accountTypes.id, name: accountTypes.name })
      .from(accountTypes);
    const typeMap = Object.fromEntries(types.map((t) => [t.name, t.id]));

    // 3. Principal inflow — sum capital of active accounts by type
    const activeAccounts = await db
      .select({
        capital: accounts.capital,
        accountTypeId: accounts.account_type_id,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
      })
      .from(accounts)
      .where(eq(accounts.status, "active"));

    let fixRatePrincipal = 0, fixRateCount = 0;
    let floatingRatePrincipal = 0, floatingRateCount = 0;
    let installmentPrincipal = 0, installmentCount = 0;

    for (const acc of activeAccounts) {
      const capital = Number(acc.capital);
      const net = (!acc.isRollover && !acc.adminFeeApplied)
        ? capital * (1 - ADMIN_FEE_PERCENTAGE)
        : capital;

      if (acc.accountTypeId === typeMap["fix"]) { fixRatePrincipal += net; fixRateCount++; }
      else if (acc.accountTypeId === typeMap["floating"]) { floatingRatePrincipal += net; floatingRateCount++; }
      else if (acc.accountTypeId === typeMap["installment"]) { installmentPrincipal += net; installmentCount++; }
    }

    const principleInflow: PrincipleInflow = {
      fixRate: fixRatePrincipal, fixRateCount,
      floatingRate: floatingRatePrincipal, floatingRateCount,
      installment: installmentPrincipal, installmentCount,
      total: fixRatePrincipal + floatingRatePrincipal + installmentPrincipal,
    };

    // 4. CoF fix rate — annual: sum(net_capital * annual_rate), monthly: / 12
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

    let cofFixRateAnnual = 0;
    for (const row of fixRateCoFResult) {
      const capital = Number(row.capital);
      const rate = Number(row.annualRate);
      const net = (!row.isRollover && !row.adminFeeApplied)
        ? capital * (1 - ADMIN_FEE_PERCENTAGE) : capital;
      cofFixRateAnnual += net * rate;
    }
    const monthlyFixRateCoF = cofFixRateAnnual / 12;

    // 5. CoF installment
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
      const net = (!row.isRollover && !row.adminFeeApplied)
        ? capital * (1 - ADMIN_FEE_PERCENTAGE) : capital;
      cofInstallment += net * monthlyRate;
    }

    const totalCoF = cofFixRateAnnual + cofInstallment;
    const totalSum = principleInflow.total + totalCoF;

    // 6. Outflow — redemptions by month
    const outflowResults = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${mutations.transaction_date})::int`,
        month: sql<number>`EXTRACT(MONTH FROM ${mutations.transaction_date})::int`,
        amount: sql<number>`SUM(${mutations.amount}::numeric)`,
      })
      .from(mutations)
      .where(and(eq(mutations.type, "redemption"), eq(mutations.status, "completed")))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${mutations.transaction_date})`,
        sql`EXTRACT(MONTH FROM ${mutations.transaction_date})`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${mutations.transaction_date})`,
        sql`EXTRACT(MONTH FROM ${mutations.transaction_date})`
      );

    const outflowRecords: OutflowRecord[] = outflowResults.map((r) => ({
      year: r.year, month: r.month, amount: Number(r.amount),
    }));
    const totalOutflow = outflowRecords.reduce((s, r) => s + r.amount, 0);

    // 7. Build CoF Table Record + AUM Table Record + Performance Table
    const cofTableRows: CofTableRow[] = [];
    const aumTableRows: AumTableRow[] = [];
    const performanceRows: PerformanceRow[] = [];

    let cumulativeCofFixRate = 0;
    let cumulativeCofFloatingRate = 0;

    for (let i = 0; i < aumRecords.length; i++) {
      const rec = aumRecords[i];
      const prevAum = i > 0 ? aumRecords[i - 1].aum : 0;
      const d = new Date(rec.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      // CoF floating rate for this month
      const monthCofFloatingRate = floatingRatePrincipal * (rec.monthlyNettRoi / 100);

      cumulativeCofFixRate += monthlyFixRateCoF;
      cumulativeCofFloatingRate += monthCofFloatingRate;

      cofTableRows.push({
        year, month,
        cofFixRate: monthlyFixRateCoF,
        cumulativeCofFixRate,
        cofFloatingRate: monthCofFloatingRate,
        cumulativeCofFloatingRate,
      });

      // AUM table — w/ Realized + Float uses gross ROI instead of nett
      // ponytail: approximation — exact value needs separate manual input
      const aumRealizedPlusFloat = rec.aum;
      aumTableRows.push({
        year, month, date: rec.date,
        aumRealized: rec.aum,
        aumRealizedPlusFloat,
      });

      // Performance table
      const monthlyGrossProfit = rec.aum - prevAum;
      const grossProfitForFloating = monthlyGrossProfit - monthlyFixRateCoF - cofInstallment;
      const grossProfitForFloatingPct = floatingRatePrincipal > 0
        ? (grossProfitForFloating / floatingRatePrincipal) * 100 : 0;

      const monthOutflow = outflowRecords.find((o) => o.year === year && o.month === month);

      const profitValdo = rec.aum * (rec.monthlyGrossRoi / 100)
        - monthCofFloatingRate - monthlyFixRateCoF - cofInstallment;

      const cumulativeRealizedPL = rec.aum - principleInflow.total - totalCoF;
      const cumulativeRealizedPLPct = totalSum > 0
        ? (cumulativeRealizedPL / totalSum) * 100 : 0;

      performanceRows.push({
        year, month,
        totalAum: rec.aum,
        principle: principleInflow.total,
        floatingRatePrinciple: floatingRatePrincipal,
        principleCoFOutflow: monthOutflow?.amount || 0,
        cofFixRate: monthlyFixRateCoF,
        cofInstallment,
        monthlyGrossProfit,
        grossProfitForFloatingRate: grossProfitForFloating,
        grossProfitForFloatingRatePct: grossProfitForFloatingPct,
        cofFloatingRate: monthCofFloatingRate,
        profitDiambilBangValdo: Math.max(0, profitValdo),
        realizedPL: cumulativeRealizedPL,
        realizedPLPct: cumulativeRealizedPLPct,
      });
    }

    const latestAum = aumRecords.length > 0 ? aumRecords[aumRecords.length - 1].aum : 0;
    const realizedPL = latestAum - totalSum;
    const realizedPLPct = totalSum > 0 ? (realizedPL / totalSum) * 100 : 0;

    return {
      success: true,
      message: "Dashboard summary loaded",
      data: {
        cofTableRows,
        aumTableRows,
        principleInflow,
        totalPrinciple: principleInflow.total,
        totalCoF,
        cofFixRateAnnual,
        cofFixRateCount: fixRateCoFResult.length,
        totalSum,
        totalAumRealized: latestAum,
        realizedPL,
        realizedPLPct,
        totalAumRealizedPlusFloat: latestAum,
        realizedPLPlusFloat: realizedPL,
        realizedPLPlusFloatPct: realizedPLPct,
        cofInstallment,
        cofInstallmentCount: installmentCoFResult.length,
        outflowRecords,
        totalOutflow,
        performanceRows,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to load dashboard summary" };
  }
}
