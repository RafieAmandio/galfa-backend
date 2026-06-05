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
 * Calculate simple-interest growth for floating rate investments.
 * Each month's gain = Net Investor Fund × monthly rate (always on original principal).
 * Partial first/last months are proportioned linearly by days.
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

    const isLastMonth =
      investmentEnd !== null &&
      isSameMonth(investmentEnd, monthGrowth.month);

    if (isFirstMonth) {
      const effectiveStartDate = max([investmentStart, monthStart]);
      const effectiveEndDate = investmentEnd
        ? min([investmentEnd, monthEnd])
        : monthEnd;

      daysActive = differenceInDays(effectiveEndDate, effectiveStartDate);
      const daysFraction = daysActive / totalDaysInMonth;

      if (monthGrowth.hasData && monthGrowth.growthPercentage > 0) {
        gainedFund =
          netInvestorFund * (monthGrowth.growthPercentage / 100) * daysFraction;
      } else {
        gainedFund = 0;
      }

      presentValueFund = netInvestorFund + gainedFund;
      previousMonthValue = netInvestorFund;
    } else if (isLastMonth) {
      const effectiveEndDate = min([investmentEnd!, monthEnd]);
      daysActive = effectiveEndDate.getDate();
      const daysFraction = daysActive / totalDaysInMonth;

      if (monthGrowth.hasData && monthGrowth.growthPercentage > 0) {
        gainedFund =
          netInvestorFund * (monthGrowth.growthPercentage / 100) * daysFraction;
      } else {
        gainedFund = 0;
      }

      presentValueFund = previousMonthValue + gainedFund;
    } else {
      daysActive = totalDaysInMonth;

      if (monthGrowth.hasData && monthGrowth.growthPercentage > 0) {
        gainedFund = netInvestorFund * (monthGrowth.growthPercentage / 100);
      } else {
        gainedFund = 0;
      }

      presentValueFund = previousMonthValue + gainedFund;
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
