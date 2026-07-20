"use server";

import { createDrizzleConnection, getDbConnectionDebug } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq, and, lt, isNotNull, sql, ilike } from "drizzle-orm";
import { getMonthlyCompoundRate } from "@/lib/utils/rate-calculations";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { format } from "date-fns";

function getLocalDate(d: Date): number {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).getUTCDate();
}

interface MonthlyData {
  monthYear: string;
  daysInPeriod: number;
  effectiveRate: number; // Rate for this specific period
  beginningBalance: number;
  monthlyInterest: number;
  endingBalance: number;
  redemptions?: number; // Add redemptions tracking
}

interface FlatRateInvestment {
  id: number; // Add account ID
  name: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  rate: number;
  transDate: Date;
  endDate: Date;
  status: string;
  annualizedCoF: number;
  currentValue: number; // NPV with redemptions
  totalRedemptions: number; // Total amount redeemed
  remainingPrincipal: number; // Principal after redemptions
  monthlyData: MonthlyData[];
}

/**
 * Update expired accounts to 'expired' status
 * This ensures accounts past their end date are properly marked as expired
 */
async function updateMaturedAccounts(db: any): Promise<void> {
  try {
    const currentDate = new Date();

    const result = await db
      .update(accounts)
      .set({
        status: "mature",
        updated_at: currentDate,
      })
      .where(
        and(
          eq(accounts.status, "active"),
          isNotNull(accounts.end_date),
          lt(accounts.end_date, currentDate)
        )
      )
      .returning({ id: accounts.id });

    if (result.length > 0) {
      console.log(
        `Updated ${result.length} matured accounts to 'mature' status`
      );
    }
  } catch (error) {
    console.error("Error updating matured accounts:", error);
    // Don't throw error to prevent function from failing
  }
}

export async function getFlatRateInvestments(
  { page = 1, pageSize = 10, search }: { page?: number; pageSize?: number; search?: string } = {}
) {
  console.info("DB Connection Debug:", getDbConnectionDebug());
  const db = createDrizzleConnection();

  // First, update any matured accounts to 'mature' status
  await updateMaturedAccounts(db);

  // Build search filter
  const searchFilter = search
    ? ilike(accounts.account_number, `%${search}%`)
    : undefined;

  // Get total count (with search filter)
  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(searchFilter);

  const results = await db
    .select({
      id: accounts.id, // Add account ID
      name: accounts.account_number,
      grossCapital: accounts.capital, // Full capital from database
      rate: fixRateAccounts.annual_rate,
      adminFeeRate: fixRateAccounts.admin_fee,
      transDate: accounts.transaction_date,
      endDate: accounts.end_date,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      rolloverSequence: accounts.rollover_sequence,
      status: accounts.status,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(searchFilter)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  console.info("FlatRate investments rows:", results.length);
  if (results.length > 0) {
    const sample = results[0];
    console.info("FlatRate sample row:", {
      id: sample.id,
      name: sample.name,
      status: sample.status,
      hasEndDate: Boolean(sample.endDate),
      isRollover: Boolean(sample.isRollover),
      adminFeeApplied: sample.adminFeeApplied,
      rolloverSequence: sample.rolloverSequence,
    });
  }

  // Batch-fetch all redemptions in a single query
  const accountIds = results.map((r) => r.id);
  const redemptionMap = await getBatchRedemptions(accountIds);

  // Process each result and calculate NPV with pre-fetched redemptions
  const investments = await Promise.all(
    results.map(async (result) => {
      const grossCapital = Number(result.grossCapital);
      const annualRate = Number(result.rate);
      const isRollover = result.isRollover || false;
      const adminFeeApplied = result.adminFeeApplied !== false; // Default to true if null
      const adminFeeRate = Number(result.adminFeeRate || 0);

      const adminFee = grossCapital * adminFeeRate;
      const netCapital = grossCapital - adminFee;

      // Calculate NPV with pre-fetched redemptions
      const now = new Date();
      const calcEnd = result.endDate && result.endDate < now ? result.endDate : now;
      const npvWithRedemptions = await calculateNetPresentValueWithRedemptions(
        result.id,
        grossCapital,
        annualRate,
        result.transDate,
        calcEnd,
        isRollover,
        adminFeeApplied,
        redemptionMap.get(result.id),
        adminFeeRate
      );

      return {
        id: result.id,
        name: result.name,
        grossCapital,
        adminFee,
        netCapital,
        adminFeeRate,
        rate: Number((annualRate * 100).toFixed(2)),
        transDate: result.transDate,
        endDate: result.endDate!,
        status: result.status,
        annualizedCoF: netCapital * annualRate, // CoF calculated on net capital
        currentValue: npvWithRedemptions.currentValue,
        totalRedemptions: npvWithRedemptions.totalRedemptions,
        remainingPrincipal: npvWithRedemptions.remainingPrincipal,
        monthlyData: npvWithRedemptions.monthlyBreakdown.map((month) => ({
          monthYear: month.monthYear,
          daysInPeriod: month.daysInPeriod,
          effectiveRate: 0, // Will calculate based on interest earned
          beginningBalance: month.startingBalance,
          monthlyInterest: month.interestEarned,
          endingBalance: month.endingBalance,
          redemptions: month.redemptions,
        })),
      };
    })
  );

  return { data: investments, totalCount, page, pageSize };
}

export type FlatRateInvestmentsResult = Awaited<ReturnType<typeof getFlatRateInvestments>>;

function calculateMonthlyData(params: {
  transDate: Date;
  endDate: Date;
  annualRate: number;
  netCapital: number;
}): MonthlyData[] {
  const monthlyData: MonthlyData[] = [];
  const startDate = new Date(params.transDate);
  const endDate = new Date(params.endDate);
  const monthlyRate = getMonthlyCompoundRate(params.annualRate);

  let currentBalance = params.netCapital;
  let currentDate = new Date(startDate);
  let monthCounter = 0;

  while (currentDate <= endDate) {
    monthCounter++;
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ); // Last day of current month
    const totalDaysInMonth = monthEnd.getDate();
    const actualEndDate = monthEnd > endDate ? endDate : monthEnd;

    const isStartMonth = monthCounter === 1;
    const isEndMonth = actualEndDate.getTime() === endDate.getTime();

    const bothOnFirst = getLocalDate(startDate) === 1 && getLocalDate(endDate) === 1;
    let daysInPeriod: number;
    if (isStartMonth && isEndMonth) {
      daysInPeriod = getLocalDate(actualEndDate) - getLocalDate(startDate);
      if (bothOnFirst) daysInPeriod += 1;
    } else if (isStartMonth) {
      daysInPeriod = totalDaysInMonth - getLocalDate(startDate);
    } else if (isEndMonth) {
      daysInPeriod = getLocalDate(actualEndDate);
      if (bothOnFirst) daysInPeriod += 1;
    } else {
      daysInPeriod = totalDaysInMonth;
    }
    if (daysInPeriod < 0) daysInPeriod = 0;

    const beginningBalance = currentBalance;

    // Calculate effective rate based on whether it's a full month or partial month
    let effectiveRate: number;
    let periodInterest: number;

    if (isStartMonth || isEndMonth) {
      effectiveRate = (daysInPeriod / totalDaysInMonth) * monthlyRate;
      periodInterest = beginningBalance * effectiveRate;
    } else {
      // Full month: always use the full monthly rate regardless of calendar days
      effectiveRate = monthlyRate;
      periodInterest = beginningBalance * effectiveRate;
    }

    const endingBalance = beginningBalance + periodInterest;

    const monthKey = format(currentDate, "MMMM yyyy");

    monthlyData.push({
      monthYear: monthKey,
      daysInPeriod,
      effectiveRate, // Consistent rate for full months, proportional for partial
      beginningBalance,
      monthlyInterest: periodInterest,
      endingBalance,
    });

    // Update for next iteration
    currentBalance = endingBalance;
    // Move to first day of next month
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
  }

  return monthlyData;
}
