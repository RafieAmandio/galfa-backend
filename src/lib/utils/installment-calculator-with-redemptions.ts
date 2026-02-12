import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  format,
  startOfMonth,
  addMonths,
  differenceInMonths,
  endOfMonth,
} from "date-fns";
import type { Redemption as BatchRedemption } from "./batch-redemptions";

export interface Redemption {
  amount: number;
  transactionDate: Date;
  status: string;
}

export interface InstallmentValueWithRedemptions {
  currentValue: number;
  daysInvested: number;
  totalRedemptions: number;
  remainingPrincipal: number;
  monthlyBreakdown: MonthlyInstallmentCalculation[];
}

export interface MonthlyInstallmentCalculation {
  monthYear: string;
  startingBalance: number;
  redemptions: number;
  interestEarned: number;
  endingBalance: number;
  daysInPeriod: number;
  redemptionDetails: Redemption[];
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
 * Calculate installment investment value with redemptions applied at their respective dates
 */
export async function calculateInstallmentValueWithRedemptions(
  accountId: number,
  netCapital: number,
  monthlyCof: number,
  investmentType: "principle" | "interest_only",
  startDate: Date,
  currentDate: Date = new Date(),
  prefetchedRedemptions?: BatchRedemption[]
): Promise<InstallmentValueWithRedemptions> {
  // Use pre-fetched redemptions if provided, otherwise query individually
  const redemptions = prefetchedRedemptions ?? await getAccountRedemptions(accountId);
  const totalRedemptions = redemptions.reduce((sum, r) => sum + r.amount, 0);

  let currentValue = netCapital;
  let calculationDate = new Date(startDate);
  const endDate = currentDate;
  const monthlyBreakdown: MonthlyInstallmentCalculation[] = [];

  // Calculate total days invested
  const daysInvested = Math.ceil(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate duration in months
  const durationMonths = differenceInMonths(endDate, startDate) + 1;

  // Calculate monthly principal payment for principle type
  const monthlyPrincipalPayment =
    investmentType === "principle" ? netCapital / durationMonths : 0;

  let remainingPrincipal = netCapital;

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

    // Calculate interest based on installment type and remaining balance
    let interestEarned = 0;

    if (redemptionsInPeriod.length === 0) {
      // No redemptions in this period - calculate interest on full balance
      if (investmentType === "principle") {
        // Principle type: interest calculated on original net capital
        interestEarned = netCapital * monthlyCof;
      } else {
        // Interest only type: interest calculated on remaining principal
        interestEarned = remainingPrincipal * monthlyCof;
      }
    } else {
      // Redemptions occurred - calculate interest for period before redemption
      // For simplicity, assume redemptions happen at end of month for full interest calculation
      if (investmentType === "principle") {
        // Principle type: interest calculated on original net capital
        interestEarned = netCapital * monthlyCof;
      } else {
        // Interest only type: interest calculated on remaining principal
        interestEarned = remainingPrincipal * monthlyCof;
      }
    }

    // Update remaining principal for principle type
    if (investmentType === "principle") {
      remainingPrincipal = Math.max(
        0,
        remainingPrincipal - monthlyPrincipalPayment
      );
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
      redemptionDetails: redemptionsInPeriod,
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
    remainingPrincipal,
    monthlyBreakdown,
  };
}

/**
 * Calculate installment value with known redemptions (client-side calculation)
 */
export function calculateInstallmentValueWithKnownRedemptions(
  netCapital: number,
  monthlyCof: number,
  investmentType: "principle" | "interest_only",
  startDate: Date,
  currentDate: Date = new Date(),
  redemptions: Redemption[] = []
): InstallmentValueWithRedemptions {
  const totalRedemptions = redemptions.reduce((sum, r) => sum + r.amount, 0);

  let currentValue = netCapital;
  let calculationDate = new Date(startDate);
  const endDate = currentDate;
  const monthlyBreakdown: MonthlyInstallmentCalculation[] = [];

  // Calculate total days invested
  const daysInvested = Math.ceil(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate duration in months
  const durationMonths = differenceInMonths(endDate, startDate) + 1;

  // Calculate monthly principal payment for principle type
  const monthlyPrincipalPayment =
    investmentType === "principle" ? netCapital / durationMonths : 0;

  let remainingPrincipal = netCapital;

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

    // Calculate interest based on installment type and remaining balance
    let interestEarned = 0;

    if (redemptionsInPeriod.length === 0) {
      // No redemptions in this period - calculate interest on full balance
      if (investmentType === "principle") {
        // Principle type: interest calculated on original net capital
        interestEarned = netCapital * monthlyCof;
      } else {
        // Interest only type: interest calculated on remaining principal
        interestEarned = remainingPrincipal * monthlyCof;
      }
    } else {
      // Redemptions occurred - calculate interest for period before redemption
      // For simplicity, assume redemptions happen at end of month for full interest calculation
      if (investmentType === "principle") {
        // Principle type: interest calculated on original net capital
        interestEarned = netCapital * monthlyCof;
      } else {
        // Interest only type: interest calculated on remaining principal
        interestEarned = remainingPrincipal * monthlyCof;
      }
    }

    // Update remaining principal for principle type
    if (investmentType === "principle") {
      remainingPrincipal = Math.max(
        0,
        remainingPrincipal - monthlyPrincipalPayment
      );
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
      redemptionDetails: redemptionsInPeriod,
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
    remainingPrincipal,
    monthlyBreakdown,
  };
}
