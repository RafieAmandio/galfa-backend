"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { sum, avg } from "drizzle-orm";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface VCPerformanceData {
  month: Date;
  totalAUM: number;
  totalProfitTaken: number;
  averageAUM: number;
  averageProfitTaken: number;
  dataPointsCount: number;
  latestAUM: number;
  latestProfitTaken: number;
  latestDate: Date | null;
}

interface VCPerformanceResponse {
  success: boolean;
  data?: VCPerformanceData | null;
  message: string;
}

export async function getVCPerformanceByMonth(
  selectedMonth: Date
): Promise<VCPerformanceResponse> {
  try {
    const db = createDrizzleConnection();
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    // Get all VC performance data for the selected month
    const monthlyData = await db
      .select()
      .from(vcPerformance)
      .where(
        and(
          gte(vcPerformance.date, monthStart),
          lt(vcPerformance.date, monthEnd)
        )
      )
      .orderBy(vcPerformance.date);

    const recordCount = monthlyData.length;
    const monthName = format(monthStart, "MMMM yyyy");

    // Handle no records found - return success with null data and warning message
    if (recordCount === 0) {
      return {
        success: true,
        data: null,
        message: `No performance data found for ${monthName}. This is expected if performance data hasn't been entered yet.`,
      };
    }

    // Handle multiple records - still return data but with warning
    let warningMessage = "";
    if (recordCount > 1) {
      warningMessage = `Warning: Found ${recordCount} performance records for ${monthName}. Expected only 1 record per month.`;
    }

    // Use the single record (first one if multiple)
    const performanceRecord = monthlyData[0];

    const vcPerformanceData: VCPerformanceData = {
      month: monthStart,
      totalAUM: Number(performanceRecord.aum),
      totalProfitTaken: Number(performanceRecord.profitTaken),
      averageAUM: Number(performanceRecord.aum),
      averageProfitTaken: Number(performanceRecord.profitTaken),
      dataPointsCount: recordCount,
      latestAUM: Number(performanceRecord.aum),
      latestProfitTaken: Number(performanceRecord.profitTaken),
      latestDate: performanceRecord.date,
    };

    return {
      success: true,
      data: vcPerformanceData,
      message:
        warningMessage ||
        `Successfully retrieved performance data for ${monthName}`,
    };
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return {
      success: false,
      message: "Failed to fetch performance data",
    };
  }
}
