"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getFloatingRateAllocatedProfit } from "./get-floating-rate-allocated-profit";

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
 * Calculate floating rate growth percentage for investors
 * Business Rules:
 * - If performance % < 24%: growth % = performance % / 12
 * - If performance % >= 24%: growth % = 1.42%
 */
export async function getFloatingRateGrowthPercentage(
  month: Date
): Promise<FloatingRateGrowthResult> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  try {
    // Get the performance percentage from the allocated profit function
    const allocatedProfitResult = await getFloatingRateAllocatedProfit(month);

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
