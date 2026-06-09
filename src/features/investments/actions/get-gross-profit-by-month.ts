"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { and, gte, lt } from "drizzle-orm";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { getInflowByMonth } from "./get-inflow-by-month";
import { getOutflowByMonth } from "./get-outflow-by-month";

interface GrossProfitData {
  month: Date;
  currentMonthAUM: number;
  previousMonthAUM: number;
  totalInflow: number;
  totalOutflow: number;
  grossProfit: number;
  grossProfitPercentage: number;
  calculation: {
    formula: string;
    breakdown: string;
    percentageFormula: string;
    percentageBreakdown: string;
  };
  hasCurrentMonthData: boolean;
  hasPreviousMonthData: boolean;
}

interface GrossProfitResponse {
  success: boolean;
  data?: GrossProfitData;
  message: string;
}

export async function getGrossProfitByMonth(
  selectedMonth: Date
): Promise<GrossProfitResponse> {
  try {
    const db = createDrizzleConnection();
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    // Get previous month
    const previousMonth = subMonths(selectedMonth, 1);
    const previousMonthStart = startOfMonth(previousMonth);
    const previousMonthEnd = endOfMonth(previousMonth);

    const [currentMonthAUMResult, previousMonthAUMResult, inflowResult, outflowResult] = await Promise.all([
      db
        .select({
          aum: vcPerformance.aum,
          date: vcPerformance.date,
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
          date: vcPerformance.date,
        })
        .from(vcPerformance)
        .where(
          and(
            gte(vcPerformance.date, previousMonthStart),
            lt(vcPerformance.date, previousMonthEnd)
          )
        )
        .limit(1),
      getInflowByMonth(selectedMonth),
      getOutflowByMonth(selectedMonth),
    ]);

    // Extract values
    const currentMonthAUM =
      currentMonthAUMResult.length > 0
        ? Number(currentMonthAUMResult[0].aum)
        : 0;

    const previousMonthAUM =
      previousMonthAUMResult.length > 0
        ? Number(previousMonthAUMResult[0].aum)
        : 0;

    const totalInflow =
      inflowResult.success && inflowResult.data
        ? inflowResult.data.totalNetInflowFunds
        : 0;

    const totalOutflow =
      outflowResult.success && outflowResult.data
        ? outflowResult.data.totalOutflow
        : 0;

    // Calculate gross profit
    // Formula: Current AUM - Current Inflow + Current Outflow - Previous AUM
    const grossProfit =
      currentMonthAUM - totalInflow + totalOutflow - previousMonthAUM;

    // Calculate gross profit percentage
    // Formula: Gross Profit / (Current AUM - Current Inflow + Current Outflow)
    const denominator = currentMonthAUM - totalInflow + totalOutflow;
    const grossProfitPercentage =
      denominator !== 0 ? (grossProfit / denominator) * 100 : 0;

    const monthName = format(monthStart, "MMMM yyyy");

    const previousMonthName = format(previousMonthStart, "MMMM yyyy");

    const hasCurrentMonthData = currentMonthAUMResult.length > 0;
    const hasPreviousMonthData = previousMonthAUMResult.length > 0;

    // Create detailed breakdown
    const formula =
      "Gross Profit = Current AUM - Inflow + Outflow - Previous AUM";
    const breakdown = `${currentMonthAUM.toLocaleString()} - ${totalInflow.toLocaleString()} + ${totalOutflow.toLocaleString()} - ${previousMonthAUM.toLocaleString()} = ${grossProfit.toLocaleString()}`;

    const percentageFormula =
      "Gross Profit % = Gross Profit / (Current AUM - Inflow + Outflow) × 100";
    const percentageBreakdown =
      denominator !== 0
        ? `${grossProfit.toLocaleString()} / (${currentMonthAUM.toLocaleString()} - ${totalInflow.toLocaleString()} + ${totalOutflow.toLocaleString()}) × 100 = ${grossProfitPercentage.toFixed(
            2
          )}%`
        : "Cannot calculate percentage: denominator is zero";

    const grossProfitData: GrossProfitData = {
      month: monthStart,
      currentMonthAUM,
      previousMonthAUM,
      totalInflow,
      totalOutflow,
      grossProfit,
      grossProfitPercentage,
      calculation: {
        formula,
        breakdown,
        percentageFormula,
        percentageBreakdown,
      },
      hasCurrentMonthData,
      hasPreviousMonthData,
    };

    // Determine message based on data availability
    let message = `Successfully calculated gross profit for ${monthName}`;
    if (!hasCurrentMonthData && !hasPreviousMonthData) {
      message = `No AUM data found for ${monthName} or ${previousMonthName}. Calculation may be incomplete.`;
    } else if (!hasCurrentMonthData) {
      message = `No AUM data found for ${monthName}. Using 0 for current month AUM.`;
    } else if (!hasPreviousMonthData) {
      message = `No AUM data found for ${previousMonthName}. Using 0 for previous month AUM.`;
    }

    return {
      success: true,
      data: grossProfitData,
      message,
    };
  } catch (error) {
    console.error("Error calculating gross profit:", error);
    return {
      success: false,
      message: "Failed to calculate gross profit",
    };
  }
}
