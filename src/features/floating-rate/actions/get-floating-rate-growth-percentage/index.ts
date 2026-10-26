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

// Monthly nett ROI (investor) from Nana's consolidated spreadsheet (AUM ROI II).
// These are the FINAL monthly rates — cap/floor already applied.
const MONTHLY_NETT_RATES: Record<string, number> = {
  "2023-01": 1.42, "2023-02": 1.42, "2023-03": 1.42, "2023-04": 1.42,
  "2023-05": 1.42, "2023-06": 1.42, "2023-07": 1.42, "2023-08": 1.42,
  "2023-09": 1.42, "2023-10": 1.42, "2023-11": 1.42, "2023-12": 1.32,
  "2024-01": 1.39, "2024-02": 1.24, "2024-03": 1.25, "2024-04": 1.17,
  "2024-05": 1.16, "2024-06": 1.11, "2024-07": 1.22, "2024-08": 1.24,
  "2024-09": 1.27, "2024-10": 1.28, "2024-11": 1.28, "2024-12": 1.17,
  "2025-01": 1.42, "2025-02": 1.42, "2025-03": 1.42, "2025-04": 1.42,
  "2025-05": 1.05, "2025-06": 1.11, "2025-07": 1.92, "2025-08": 1.17,
  "2025-09": 1.42, "2025-10": 1.42, "2025-11": 1.00, "2025-12": 1.22,
  "2026-01": 1.42, "2026-02": 0.80, "2026-03": 0.80, "2026-04": 0.80,
  "2026-05": 0.50, "2026-06": 0.80, "2026-07": 0.80, "2026-08": 0.80,
};

// Cap/floor for months not in the override table.
// Formula from Nana: =IF(perf<0, 9.6%, MIN(perf, 17%)) then /12
function applyCapFloor(annualPerformance: number): number {
  const capped = annualPerformance < 0 ? 9.6 : Math.min(annualPerformance, 17);
  return capped / 12;
}

function resolveGrowthRate(monthKey: string): { growthPercentage: number; isOverride: boolean } | null {
  const override = MONTHLY_NETT_RATES[monthKey];
  if (override !== undefined) {
    return { growthPercentage: override, isOverride: true };
  }
  return null;
}

async function calculateFloatingRateGrowthInternal(
  month: Date
): Promise<FloatingRateGrowthResult> {
  try {
    const monthKey = format(month, "yyyy-MM");
    const resolved = resolveGrowthRate(monthKey);

    let growthPercentage: number;
    let performancePercentage: number;
    let hasPerformanceData: boolean;
    let rule: string;
    let breakdown: string;

    if (resolved) {
      growthPercentage = resolved.growthPercentage;
      performancePercentage = growthPercentage * 12;
      hasPerformanceData = true;
      rule = "Monthly nett rate from spreadsheet";
      breakdown = `${growthPercentage.toFixed(2)}% monthly`;
    } else {
      const allocatedProfitResult = await getFloatingRateAllocatedProfitPublic(month);
      hasPerformanceData = !!(allocatedProfitResult.success && allocatedProfitResult.data);
      if (!hasPerformanceData) {
        return {
          success: false,
          message: "Unable to calculate growth percentage: no performance data available",
        };
      }
      performancePercentage = allocatedProfitResult.data!.performancePercentage;
      growthPercentage = applyCapFloor(performancePercentage);
      rule = "Growth = capFloor(Performance) / 12";
      breakdown = `${performancePercentage.toFixed(2)}% → capped → ${growthPercentage.toFixed(2)}% monthly`;
    }

    return {
      success: true,
      message: `Successfully calculated floating rate growth percentage: ${growthPercentage.toFixed(4)}%`,
      data: {
        month,
        performancePercentage,
        growthPercentage,
        calculation: {
          rule,
          formula: "Growth % = capFloor(Performance %) / 12",
          breakdown,
        },
        hasPerformanceData,
      },
    };
  } catch (error) {
    console.error("Get floating rate growth percentage error:", error);
    return {
      success: false,
      message: "An error occurred while calculating floating rate growth percentage",
    };
  }
}

export const getFloatingRateGrowthPercentage = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  return calculateFloatingRateGrowthInternal(month);
});

export const getFloatingRateGrowthPercentageInternal = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  return calculateFloatingRateGrowthInternal(month);
});

export const getFloatingRateGrowthPercentagePublic = cache(async function (
  month: Date
): Promise<FloatingRateGrowthResult> {
  return calculateFloatingRateGrowthInternal(month);
});

export async function getBatchFloatingRateGrowthPercentages(
  startDate: Date,
  endDate: Date
): Promise<Map<string, GrowthData>> {
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
        const resolved = resolveGrowthRate(key);

        if (resolved) {
          return {
            key,
            data: {
              growthPercentage: resolved.growthPercentage,
              performancePercentage: resolved.growthPercentage * 12,
              appliedRule: "Spreadsheet rate",
              hasData: true,
            } as GrowthData,
          };
        }

        const allocatedProfitResult = await getFloatingRateAllocatedProfitPublic(m);
        if (!allocatedProfitResult.success || !allocatedProfitResult.data) {
          return { key, data: { growthPercentage: 0, performancePercentage: 0, appliedRule: "No data available", hasData: false } as GrowthData };
        }

        const perf = allocatedProfitResult.data.performancePercentage;
        const growthPercentage = applyCapFloor(perf);

        return {
          key,
          data: {
            growthPercentage,
            performancePercentage: perf,
            appliedRule: `capFloor(${perf.toFixed(1)}%) → ${growthPercentage.toFixed(2)}%`,
            hasData: true,
          } as GrowthData,
        };
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
