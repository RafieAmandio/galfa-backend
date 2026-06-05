import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { format, startOfMonth, addMonths, isAfter } from "date-fns";
import { getFloatingRateGrowthPercentage } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage";
import type { Redemption as BatchRedemption } from "./batch-redemptions";

export interface Redemption {
  amount: number;
  transactionDate: Date;
  status: string;
}

export interface FloatingRateValueWithRedemptions {
  currentValue: number;
  daysInvested: number;
  totalRedemptions: number;
  remainingPrincipal: number;
  monthlyBreakdown: MonthlyFloatingRateCalculation[];
}

export interface MonthlyFloatingRateCalculation {
  monthYear: string;
  startingBalance: number;
  redemptions: number;
  gainedFund: number;
  endingBalance: number;
  daysInPeriod: number;
  growthRate: number;
  performanceRate: number;
  appliedRule: string;
  hasData: boolean;
  redemptionDetails: Redemption[];
}

export interface GrowthData {
  growthPercentage: number;
  performancePercentage: number;
  appliedRule: string;
  hasData: boolean;
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
 * Calculate floating rate investment value with redemptions applied at their respective dates
 */
export async function calculateFloatingRateValueWithRedemptions(
  accountId: number,
  netInvestorFund: number,
  transactionDate: Date,
  currentDate: Date = new Date(),
  prefetchedRedemptions?: BatchRedemption[],
  prefetchedGrowthRates?: Map<string, GrowthData>,
  investmentEndDate?: Date | null
): Promise<FloatingRateValueWithRedemptions> {
  // Use pre-fetched redemptions if provided, otherwise query individually
  const redemptions = prefetchedRedemptions ?? await getAccountRedemptions(accountId);
  const totalRedemptions = redemptions.reduce((sum, r) => sum + r.amount, 0);

  let currentValue = netInvestorFund;
  let calculationDate = startOfMonth(transactionDate);
  // Hide the in-progress month: cap end at the last completed month
  const lastCompletedMonth = startOfMonth(
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  );
  // If fund has an end date, don't compute past it
  const endDate = investmentEndDate && startOfMonth(investmentEndDate) < lastCompletedMonth
    ? startOfMonth(investmentEndDate)
    : lastCompletedMonth;
  const monthlyBreakdown: MonthlyFloatingRateCalculation[] = [];

  // Calculate total days invested
  const effectiveEnd = investmentEndDate && investmentEndDate < currentDate ? investmentEndDate : currentDate;
  const daysInvested = Math.ceil(
    (effectiveEnd.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let isFirstMonth = true;

  while (!isAfter(calculationDate, endDate)) {
    const monthStart = calculationDate;
    const monthEnd = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      0
    );

    // Get growth rate data for this month
    let growthData: GrowthData = {
      growthPercentage: 0,
      performancePercentage: 0,
      appliedRule: "No data available",
      hasData: false,
    };

    if (prefetchedGrowthRates) {
      const growthKey = format(calculationDate, "yyyy-MM");
      const cached = prefetchedGrowthRates.get(growthKey);
      if (cached) {
        growthData = cached;
      }
    } else {
      try {
        const growthResult = await getFloatingRateGrowthPercentage(
          calculationDate
        );
        if (growthResult.success && growthResult.data) {
          growthData = {
            growthPercentage: growthResult.data.growthPercentage,
            performancePercentage: growthResult.data.performancePercentage,
            appliedRule: growthResult.data.calculation.rule,
            hasData: true,
          };
        }
      } catch (error) {
        console.error(`Error getting growth rate for ${calculationDate}:`, error);
      }
    }

    const startingBalance = currentValue;

    // Apply redemptions that occurred in this month
    const redemptionsInPeriod = redemptions.filter((r) => {
      const redemptionDate = new Date(r.transactionDate);
      return redemptionDate >= monthStart && redemptionDate <= monthEnd;
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

    // Calculate growth using simple interest on original net investor fund
    let gainedFund = 0;

    if (growthData.hasData && growthData.growthPercentage > 0) {
      if (
        isFirstMonth &&
        calculationDate.getTime() === startOfMonth(transactionDate).getTime()
      ) {
        const daysPassed = Math.max(
          0,
          Math.ceil(
            (Math.min(currentDate.getTime(), monthEnd.getTime()) -
              transactionDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const totalDaysInMonth = monthEnd.getDate();
        const daysFraction = daysPassed / totalDaysInMonth;

        gainedFund =
          netInvestorFund * (growthData.growthPercentage / 100) * daysFraction;
      } else {
        gainedFund = netInvestorFund * (growthData.growthPercentage / 100);
      }
    }

    currentValue = balanceAfterRedemptions + gainedFund;

    const monthKey = format(calculationDate, "MMMM yyyy");
    const daysInPeriod = isFirstMonth
      ? Math.max(
          0,
          Math.ceil(
            (Math.min(currentDate.getTime(), monthEnd.getTime()) -
              transactionDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : monthEnd.getDate();

    monthlyBreakdown.push({
      monthYear: monthKey,
      startingBalance,
      redemptions: redemptionsThisMonth,
      gainedFund,
      endingBalance: currentValue,
      daysInPeriod,
      growthRate: growthData.growthPercentage,
      performanceRate: growthData.performancePercentage,
      appliedRule: growthData.appliedRule,
      hasData: growthData.hasData,
      redemptionDetails: redemptionsInPeriod,
    });

    // If account is fully redeemed, stop calculation
    if (isFullyRedeemed) {
      currentValue = 0; // Set final value to 0 for fully redeemed accounts
      break;
    }

    // Move to next month
    calculationDate = addMonths(calculationDate, 1);
    isFirstMonth = false;
  }

  return {
    currentValue,
    daysInvested,
    totalRedemptions,
    remainingPrincipal: netInvestorFund - totalRedemptions,
    monthlyBreakdown,
  };
}
