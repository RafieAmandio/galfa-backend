import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInDays,
  isSameMonth,
  isAfter,
  isBefore,
  max,
  min,
} from "date-fns";

/**
 * Calculate compound growth for floating rate investments
 * Two scenarios:
 * 1. Investment starts mid-month: Present Value Fund = Net Investor Fund * (1 + Growth Rate)^(remainingDaysInMonth/totalDaysInMonth)
 * 2. Investment continues from previous month: Present Value Fund = Previous Month Value * (1 + Growth Rate)
 */

export interface FloatingRateCalculationInput {
  netInvestorFund: number; // Renamed from netCapital
  transactionDate: Date;
  endDate: Date | null;
  monthlyGrowthRates: Array<{
    month: Date;
    growthPercentage: number;
    performancePercentage: number;
    hasData: boolean;
  }>;
}

export interface MonthlyValueResult {
  month: Date;
  monthLabel: string;
  performanceRate: number; // Renamed from performancePercentage
  growthRate: number; // Renamed from growthPercentage
  previousMonthValue: number;
  presentValueFund: number; // Renamed from currentMonthValue
  gainedFund: number;
  isFirstMonth: boolean;
  daysActive: number;
  totalDaysInMonth: number;
  hasData: boolean;
}

/**
 * Calculate monthly compound growth for a floating rate investment
 */
export function calculateFloatingRateMonthlyValues(
  input: FloatingRateCalculationInput
): MonthlyValueResult[] {
  const { netInvestorFund, transactionDate, endDate, monthlyGrowthRates } =
    input;
  const results: MonthlyValueResult[] = [];
  let previousMonthValue = netInvestorFund;

  for (const monthGrowth of monthlyGrowthRates) {
    const monthStart = startOfMonth(monthGrowth.month);
    const monthEnd = endOfMonth(monthGrowth.month);
    const investmentStart = transactionDate;
    const investmentEnd = endDate;

    // Check if investment is active during this month
    const isActiveInMonth =
      !isAfter(investmentStart, monthEnd) &&
      (investmentEnd === null || !isBefore(investmentEnd, monthStart));

    if (!isActiveInMonth) {
      continue;
    }

    // Determine if this is the first month of investment
    const isFirstMonth = isSameMonth(investmentStart, monthGrowth.month);

    let presentValueFund: number;
    let gainedFund: number;
    let daysActive: number;
    const totalDaysInMonth = getDaysInMonth(monthGrowth.month);

    if (isFirstMonth) {
      // Investment starts this month - use partial month calculation
      const effectiveStartDate = max([investmentStart, monthStart]);
      const effectiveEndDate = investmentEnd
        ? min([investmentEnd, monthEnd])
        : monthEnd;

      // Calculate remaining days AFTER the start date (not including start date)
      daysActive = differenceInDays(effectiveEndDate, effectiveStartDate);
      const daysFraction = daysActive / totalDaysInMonth;

      if (monthGrowth.hasData && monthGrowth.growthPercentage > 0) {
        // Formula: Present Value Fund = Net Investor Fund * (1 + Growth Rate)^(remainingDaysInMonth/totalDaysInMonth)
        presentValueFund =
          netInvestorFund *
          Math.pow(1 + monthGrowth.growthPercentage / 100, daysFraction);
      } else {
        presentValueFund = netInvestorFund;
      }

      gainedFund = presentValueFund - netInvestorFund;
      previousMonthValue = netInvestorFund; // For first month, previous value is the initial net investor fund
    } else {
      // Investment continues from previous month - use full month calculation
      daysActive = totalDaysInMonth;

      if (monthGrowth.hasData && monthGrowth.growthPercentage > 0) {
        // Formula: Present Value Fund = Previous Month Value * (1 + Growth Rate)
        presentValueFund =
          previousMonthValue * (1 + monthGrowth.growthPercentage / 100);
      } else {
        presentValueFund = previousMonthValue;
      }

      gainedFund = presentValueFund - previousMonthValue;
    }

    const monthLabel = monthGrowth.month.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    results.push({
      month: monthGrowth.month,
      monthLabel,
      performanceRate: monthGrowth.performancePercentage,
      growthRate: monthGrowth.growthPercentage,
      previousMonthValue,
      presentValueFund,
      gainedFund,
      isFirstMonth,
      daysActive,
      totalDaysInMonth,
      hasData: monthGrowth.hasData,
    });

    // Update previous month value for next iteration
    previousMonthValue = presentValueFund;
  }

  return results;
}

/**
 * Get the current value of a floating rate investment
 */
export function getCurrentFloatingRateValue(
  input: FloatingRateCalculationInput
): number {
  const monthlyValues = calculateFloatingRateMonthlyValues(input);
  const lastMonth = monthlyValues[monthlyValues.length - 1];
  return lastMonth ? lastMonth.presentValueFund : input.netInvestorFund;
}

/**
 * Get total gained fund for a floating rate investment
 */
export function getTotalGainedFund(
  input: FloatingRateCalculationInput
): number {
  const currentValue = getCurrentFloatingRateValue(input);
  return currentValue - input.netInvestorFund;
}
