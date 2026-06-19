import { getMonthlyCompoundRate } from "./rate-calculations";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { format, differenceInMonths, addDays } from "date-fns";
import { ADMIN_FEE_PERCENTAGE } from "./constants";
import type { Redemption as BatchRedemption } from "./batch-redemptions";

export interface Redemption {
  amount: number;
  transactionDate: Date;
  status: string;
}

export interface NPVWithRedemptions {
  currentValue: number;
  daysInvested: number;
  totalRedemptions: number;
  remainingPrincipal: number;
  monthlyBreakdown: MonthlyCalculation[];
}

export interface MonthlyCalculation {
  monthYear: string;
  startingBalance: number;
  redemptions: number;
  interestEarned: number;
  endingBalance: number;
  daysInPeriod: number;
}

/**
 * Get all completed redemptions for an account
 */
async function getAccountRedemptions(accountId: number): Promise<Redemption[]> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      amount: mutations.amount,
      transactionDate: mutations.transaction_date,
      status: mutations.status,
    })
    .from(mutations)
    .where(
      and(
        eq(mutations.account_id, accountId),
        eq(mutations.type, "redemption"),
        eq(mutations.status, "completed")
      )
    )
    .orderBy(mutations.transaction_date);

  return results.map((result) => ({
    amount: Number(result.amount),
    transactionDate: result.transactionDate,
    status: result.status,
  }));
}

/**
 * Calculate NPV with redemptions applied at their respective dates
 */
export async function calculateNetPresentValueWithRedemptions(
  accountId: number,
  grossCapital: number,
  annualRate: number,
  startDate: Date,
  currentDate: Date = new Date(),
  isRollover: boolean = false,
  adminFeeApplied: boolean = true,
  prefetchedRedemptions?: BatchRedemption[],
  adminFeeRate: number = 0
): Promise<NPVWithRedemptions> {
  // Apply admin fee if rate is provided
  const netCapital = adminFeeRate > 0
    ? grossCapital * (1 - adminFeeRate)
    : grossCapital;

  // Use pre-fetched redemptions if provided, otherwise query individually
  const redemptions = prefetchedRedemptions ?? await getAccountRedemptions(accountId);
  const totalRedemptions = redemptions.reduce((sum, r) => sum + r.amount, 0);

  const monthlyRate = getMonthlyCompoundRate(annualRate);
  let currentValue = netCapital;
  let remainingPrincipalForInterest = netCapital;
  let cumulativeInterestEarned = 0;
  let calculationDate = new Date(startDate);
  const now = new Date();
  const inCurrentMonth = currentDate.getFullYear() === now.getFullYear() &&
    currentDate.getMonth() === now.getMonth();
  const lastCompletedMonthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + (inCurrentMonth ? 0 : 1),
    0
  );
  const endDate =
    lastCompletedMonthEnd < currentDate ? lastCompletedMonthEnd : currentDate;
  const monthlyBreakdown: MonthlyCalculation[] = [];

  // Calculate total days invested
  const daysInvested = Math.ceil(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  while (calculationDate <= endDate) {
    const monthStart = new Date(calculationDate);
    const monthEnd = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      0
    );
    const actualEndDate = monthEnd > endDate ? endDate : monthEnd;

    const isStartMonth = calculationDate.getTime() === startDate.getTime();
    const isEndMonth = actualEndDate.getTime() === endDate.getTime();

    // Calculate days in this period using date arithmetic to avoid timezone issues
    const totalDaysInMonth = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      0
    ).getDate();

    let daysInPeriod: number;
    if (isStartMonth && isEndMonth) {
      daysInPeriod = actualEndDate.getUTCDate() - calculationDate.getUTCDate() - 1;
    } else if (isStartMonth) {
      daysInPeriod = totalDaysInMonth - calculationDate.getUTCDate() - 1;
    } else if (isEndMonth) {
      daysInPeriod = actualEndDate.getDate();
    } else {
      daysInPeriod = totalDaysInMonth;
    }
    if (daysInPeriod < 0) daysInPeriod = 0;

    const startingBalance = currentValue;

    // Apply redemptions that occurred in this period
    const redemptionsInPeriod = redemptions.filter((r) => {
      const redemptionDate = new Date(r.transactionDate);
      return redemptionDate >= monthStart && redemptionDate <= actualEndDate;
    });

    let redemptionsThisMonth = 0;
    let balanceAfterRedemptions = currentValue;

    // Apply redemptions chronologically within the month
    redemptionsInPeriod.forEach((redemption) => {
      redemptionsThisMonth += redemption.amount;
      balanceAfterRedemptions -= redemption.amount;

      // Ensure balance doesn't go negative
      if (balanceAfterRedemptions < 0) {
        balanceAfterRedemptions = 0;
      }
    });

    // If balance is fully redeemed (below threshold), end calculation here
    const isFullyRedeemed =
      balanceAfterRedemptions < 1000 && redemptionsThisMonth > 0;

    let effectiveRate: number;
    if (isStartMonth || isEndMonth) {
      effectiveRate = (daysInPeriod / totalDaysInMonth) * monthlyRate;
    } else {
      effectiveRate = monthlyRate;
    }
    let interestEarned = remainingPrincipalForInterest * effectiveRate;

    currentValue = balanceAfterRedemptions + interestEarned;

    const monthKey = format(calculationDate, "MMMM yyyy");

    monthlyBreakdown.push({
      monthYear: monthKey,
      startingBalance,
      redemptions: redemptionsThisMonth,
      interestEarned,
      endingBalance: currentValue,
      daysInPeriod,
    });

    // If account is fully redeemed, stop calculation
    if (isFullyRedeemed) {
      currentValue = 0; // Set final value to 0 for fully redeemed accounts
      break;
    }

    // Move to first day of next month
    calculationDate = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      1
    );
  }

  return {
    currentValue,
    daysInvested,
    totalRedemptions,
    remainingPrincipal: netCapital - totalRedemptions,
    monthlyBreakdown,
  };
}
