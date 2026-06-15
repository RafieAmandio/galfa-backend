"use server";

import { getFloatingRateAllocatedProfitPublic } from "../get-floating-rate-allocated-profit/index";
import { startOfMonth, addMonths, isAfter, format } from "date-fns";
import { cache } from "react";
import type { GrowthData } from "@/lib/utils/floating-rate-calculator-with-redemptions";

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

const PERFORMANCE_OVERRIDES: Record<string, number> = {
  "2025-01": 17.00,
  "2025-02": 17.08,
  "2025-03": 17.00,
  "2025-04": 17.05,
  "2025-05": 12.66,
  "2025-06": 13.31,
  "2025-07": 17.03,
  "2025-08": 14.03,
  "2025-09": 47.03,
  "2025-10": 55.25,
  "2025-11": 12.00,
  "2025-12": 7.92,
  "2026-01": 27.81,
  "2026-02": 9.60,
  "2026-03": 9.60,
};

async function calculateFloatingRateGrowthInternal(
  month: Date
): Promise<FloatingRateGrowthResult> {
  try {
    const monthKey = format(month, "yyyy-MM");
    const overridePerf = PERFORMANCE_OVERRIDES[monthKey];

    let performancePercentage: number;
    let hasPerformanceData: boolean;

    if (overridePerf !== undefined) {
      performancePercentage = overridePerf;
      hasPerformanceData = true;
    } else {
      const allocatedProfitResult = await getFloatingRateAllocatedProfitPublic(
        month
      );
      hasPerformanceData = !!(
        allocatedProfitResult.success && allocatedProfitResult.data
      );
      if (!hasPerformanceData) {
        return {
          success: false,
          message:
            "Unable to calculate growth percentage: no performance data available",
        };
      }
      performancePercentage =
        allocatedProfitResult.data!.performancePercentage;
    }
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
      // Rule 2: Performance >= 24% → Growth = 17%/12 ≈ 1.4167%
      growthPercentage = 17 / 12;
      rule = "Performance ≥ 24%";
      formula = "Growth % = 17%/12 ≈ 1.4167% (capped rate)";
      breakdown = `Performance: ${performancePercentage.toFixed(
        2
      )}% → Growth: ${(17 / 12).toFixed(4)}%`;
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
        4
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
 * - If performance % >= 24%: growth % = 17%/12 ≈ 1.4167%
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
 * - If performance % >= 24%: growth % = 17%/12 ≈ 1.4167%
 */
export const getFloatingRateGrowthPercentageInternal = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  return calculateFloatingRateGrowthInternal(month);
});

/**
 * Calculate floating rate growth percentage for investors (public version)
 * Uses the allocated profit method (same as calculateFloatingRateGrowthInternal)
 * Business Rules:
 * - If performance % < 24%: growth % = performance % / 12
 * - If performance % >= 24%: growth % = 17%/12 ≈ 1.4167%
 */
export const getFloatingRateGrowthPercentagePublic = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  return calculateFloatingRateGrowthInternal(month);
});

/**
 * Batch-fetch growth percentages for a date range using the allocated profit method.
 * Calls getFloatingRateAllocatedProfitPublic for each month in parallel.
 */
export async function getBatchFloatingRateGrowthPercentages(
  startDate: Date,
  endDate: Date
): Promise<Map<string, GrowthData>> {
  // Build list of months in range
  const months: Date[] = [];
  let month = startOfMonth(startDate);
  const end = startOfMonth(endDate);

  while (!isAfter(month, end)) {
    months.push(month);
    month = addMonths(month, 1);
  }

  const results = await Promise.all(
    months.map(async (m) => {
      const key = format(m, "yyyy-MM");
      try {
        const overridePerf = PERFORMANCE_OVERRIDES[key];
        let performancePercentage: number;

        if (overridePerf !== undefined) {
          performancePercentage = overridePerf;
        } else {
          const allocatedProfitResult = await getFloatingRateAllocatedProfitPublic(m);
          if (!allocatedProfitResult.success || !allocatedProfitResult.data) {
            return { key, data: { growthPercentage: 0, performancePercentage: 0, appliedRule: "No data available", hasData: false } as GrowthData };
          }
          performancePercentage = allocatedProfitResult.data.performancePercentage;
        }

        let growthPercentage: number;
        let appliedRule: string;

        if (performancePercentage < 24) {
          growthPercentage = performancePercentage / 12;
          appliedRule = "Performance < 24%";
        } else {
          growthPercentage = 17 / 12;
          appliedRule = "Performance ≥ 24%";
        }

        return { key, data: { growthPercentage, performancePercentage, appliedRule, hasData: true } as GrowthData };
      } catch {
        return { key, data: { growthPercentage: 0, performancePercentage: 0, appliedRule: "Error occurred", hasData: false } as GrowthData };
      }
    })
  );

  const growthMap = new Map<string, GrowthData>();
  for (const { key, data } of results) {
    growthMap.set(key, data);
  }

  return growthMap;
}
