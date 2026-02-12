import { getMonthlyCompoundRate } from "./rate-calculations";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import { ADMIN_FEE_PERCENTAGE } from "./constants";

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
  adminFeeApplied: boolean = true
): Promise<NPVWithRedemptions> {
  // For flat rate investments, use gross capital directly (no admin fee)
  const netCapital = grossCapital;

  // Get all redemptions for this account
  const redemptions = await getAccountRedemptions(accountId);
  const totalRedemptions = redemptions.reduce((sum, r) => sum + r.amount, 0);

  const monthlyRate = getMonthlyCompoundRate(annualRate);
  let currentValue = netCapital;
  let calculationDate = new Date(startDate);
  const endDate = currentDate;
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

    // Calculate days in this period
    let daysInPeriod = Math.ceil(
      (actualEndDate.getTime() - calculationDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const isStartMonth = calculationDate.getTime() === startDate.getTime();
    const isEndMonth = actualEndDate.getTime() === endDate.getTime();

    if (!isStartMonth && !isEndMonth) {
      daysInPeriod += 1;
    }

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

    // Calculate interest based on when redemptions occur
    let interestEarned = 0;

    if (redemptionsInPeriod.length === 0) {
      // No redemptions in this period - calculate interest on full balance
      let effectiveRate: number;
      if (isStartMonth || isEndMonth) {
        const actualMonthDays = new Date(
          calculationDate.getFullYear(),
          calculationDate.getMonth() + 1,
          0
        ).getDate();
        effectiveRate = (daysInPeriod / actualMonthDays) * monthlyRate;
      } else {
        effectiveRate = monthlyRate;
      }
      interestEarned = currentValue * effectiveRate;
    } else {
      // Redemptions occurred - calculate interest for period before redemption
      // For simplicity, assume redemptions happen at end of month for full interest calculation
      let effectiveRate: number;
      if (isStartMonth || isEndMonth) {
        const actualMonthDays = new Date(
          calculationDate.getFullYear(),
          calculationDate.getMonth() + 1,
          0
        ).getDate();
        effectiveRate = (daysInPeriod / actualMonthDays) * monthlyRate;
      } else {
        effectiveRate = monthlyRate;
      }
      interestEarned = currentValue * effectiveRate;
    }

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
