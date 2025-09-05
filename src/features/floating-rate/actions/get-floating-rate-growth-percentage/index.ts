"use server";

import { getFloatingRateAllocatedProfitPublic } from "../get-floating-rate-allocated-profit/index";
// Add direct database import for simple performance query
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { and, gte, lt } from "drizzle-orm";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cache } from "react";

interface FloatingRateGrowthData {
  month: Date;
  performancePercentage: number;
  growthPercentage: number;
  calculation: {
    rule: string;
    formula: string;
    breakdown: string;
  };
  hasPerformanceData: boolean;
}

interface FloatingRateGrowthResult {
  success: boolean;
  message: string;
  data?: FloatingRateGrowthData;
}

/**
 * Internal function to calculate floating rate growth percentage
 * Used by both admin and investor functions
 * Business Rules:
 * - If performance % < 24%: growth % = performance % / 12
 * - If performance % >= 24%: growth % = 1.42%
 */
async function calculateFloatingRateGrowthInternal(
  month: Date
): Promise<FloatingRateGrowthResult> {
  try {
    // Get the performance percentage from the allocated profit function
    const allocatedProfitResult = await getFloatingRateAllocatedProfitPublic(
      month
    );

    // Check if we have performance data
    const hasPerformanceData = !!(
      allocatedProfitResult.success && allocatedProfitResult.data
    );

    if (!hasPerformanceData) {
      return {
        success: false,
        message:
          "Unable to calculate growth percentage: no performance data available",
      };
    }

    const performancePercentage =
      allocatedProfitResult.data!.performancePercentage;
    let growthPercentage: number;
    let rule: string;
    let formula: string;
    let breakdown: string;

    // Apply business rules
    if (performancePercentage < 24) {
      // Rule 1: Performance < 24% → Growth = Performance / 12
      growthPercentage = performancePercentage / 12;
      rule = "Performance < 24%";
      formula = "Growth % = Performance % / 12";
      breakdown = `${performancePercentage.toFixed(
        2
      )}% / 12 = ${growthPercentage.toFixed(2)}%`;
    } else {
      // Rule 2: Performance >= 24% → Growth = 1.42%
      growthPercentage = 1.42;
      rule = "Performance ≥ 24%";
      formula = "Growth % = 1.42% (fixed rate)";
      breakdown = `Performance: ${performancePercentage.toFixed(
        2
      )}% → Growth: 1.42%`;
    }

    const data: FloatingRateGrowthData = {
      month,
      performancePercentage,
      growthPercentage,
      calculation: {
        rule,
        formula,
        breakdown,
      },
      hasPerformanceData,
    };

    return {
      success: true,
      message: `Successfully calculated floating rate growth percentage: ${growthPercentage.toFixed(
        2
      )}%`,
      data,
    };
  } catch (error) {
    console.error("Get floating rate growth percentage error:", error);
    return {
      success: false,
      message:
        "An error occurred while calculating floating rate growth percentage",
    };
  }
}

/**
 * Calculate floating rate growth percentage for investors (with admin check)
 * Business Rules:
 * - If performance % < 24%: growth % = performance % / 12
 * - If performance % >= 24%: growth % = 1.42%
 */
export const getFloatingRateGrowthPercentage = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  // Check admin access
  // Remove Admin Access Check for now because we are using this for investor view
  // const adminCheck = await checkAdminAccess();
  // if (!adminCheck.isAdmin) {
  //   return {
  //     success: false,
  //     message: "Unauthorized: Admin access required",
  //   };
  // }

  return calculateFloatingRateGrowthInternal(month);
});

/**
 * Calculate floating rate growth percentage for investors (internal use)
 * Business Rules:
 * - If performance % < 24%: growth % = performance % / 12
 * - If performance % >= 24%: growth % = 1.42%
 */
export const getFloatingRateGrowthPercentageInternal = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  return calculateFloatingRateGrowthInternal(month);
});

/**
 * Calculate floating rate growth percentage for investors (public version)
 * Simplified version that directly calculates performance from VC data
 * Business Rules:
 * - If performance % < 24%: growth % = performance % / 12
 * - If performance % >= 24%: growth % = 1.42%
 */
export const getFloatingRateGrowthPercentagePublic = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  try {
    const db = createDrizzleConnection();
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const previousMonth = subMonths(month, 1);
    const previousMonthStart = startOfMonth(previousMonth);
    const previousMonthEnd = endOfMonth(previousMonth);

    // Get current and previous month AUM from vc_performance
    const [currentMonthResult, previousMonthResult] = await Promise.all([
      db
        .select({
          aum: vcPerformance.aum,
          profitTaken: vcPerformance.profitTaken,
        })
        .from(vcPerformance)
        .where(
          and(
            gte(vcPerformance.date, monthStart),
            lt(vcPerformance.date, monthEnd)
          )
        )
        .limit(1),
      db
        .select({
          aum: vcPerformance.aum,
          profitTaken: vcPerformance.profitTaken,
        })
        .from(vcPerformance)
        .where(
          and(
            gte(vcPerformance.date, previousMonthStart),
            lt(vcPerformance.date, previousMonthEnd)
          )
        )
        .limit(1),
    ]);

    const hasCurrentData = currentMonthResult.length > 0;
    const hasPreviousData = previousMonthResult.length > 0;

    if (!hasCurrentData || !hasPreviousData) {
      // If no performance data, return clear message about unavailable data
      return {
        success: false,
        message: "Performance data not available for the selected month",
        data: {
          month,
          performancePercentage: 0,
          growthPercentage: 0,
          calculation: {
            rule: "No data available",
            formula: "N/A",
            breakdown: "Performance data is not available for this month",
          },
          hasPerformanceData: false,
        },
      };
    }

    const currentAUM = Number(currentMonthResult[0].aum);
    const previousAUM = Number(previousMonthResult[0].aum);
    const profitTaken = Number(currentMonthResult[0].profitTaken);

    // Simple performance calculation: month-over-month AUM growth
    const performancePercentage =
      previousAUM > 0
        ? ((currentAUM - previousAUM) / previousAUM) * 100 * 12 // Annualized
        : 0;

    let growthPercentage: number;
    let rule: string;
    let formula: string;
    let breakdown: string;

    // Apply business rules
    if (performancePercentage < 24) {
      // Rule 1: Performance < 24% → Growth = Performance / 12
      growthPercentage = performancePercentage / 12;
      rule = "Performance < 24%";
      formula = "Growth % = Performance % / 12";
      breakdown = `${performancePercentage.toFixed(
        2
      )}% / 12 = ${growthPercentage.toFixed(2)}%`;
    } else {
      // Rule 2: Performance >= 24% → Growth = 1.42%
      growthPercentage = 1.42;
      rule = "Performance ≥ 24%";
      formula = "Growth % = 1.42% (fixed rate)";
      breakdown = `Performance: ${performancePercentage.toFixed(
        2
      )}% → Growth: 1.42%`;
    }

    const data: FloatingRateGrowthData = {
      month,
      performancePercentage,
      growthPercentage,
      calculation: {
        rule,
        formula,
        breakdown,
      },
      hasPerformanceData: true,
    };

    return {
      success: true,
      message: `Successfully calculated floating rate growth percentage: ${growthPercentage.toFixed(
        2
      )}%`,
      data,
    };
  } catch (error) {
    console.error("Get floating rate growth percentage public error:", error);

    // Return error message instead of defaults
    return {
      success: false,
      message: "Error accessing performance data",
      data: {
        month,
        performancePercentage: 0,
        growthPercentage: 0,
        calculation: {
          rule: "Error occurred",
          formula: "N/A",
          breakdown: "Unable to access performance data due to an error",
        },
        hasPerformanceData: false,
      },
    };
  }
});
