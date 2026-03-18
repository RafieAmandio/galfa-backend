"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { and, sql } from "drizzle-orm";
import { format } from "date-fns";

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
    const inputDate = new Date(selectedMonth);
    const targetMonth = inputDate.getMonth() + 1;
    const targetYear = inputDate.getFullYear();

    // Get all VC performance data for the selected month using extract for timezone safety
    const monthlyData = await db
      .select()
      .from(vcPerformance)
      .where(
        and(
          sql`extract(month from ${vcPerformance.date}) = ${targetMonth}`,
          sql`extract(year from ${vcPerformance.date}) = ${targetYear}`
        )
      )
      .orderBy(vcPerformance.date);

    const recordCount = monthlyData.length;
    const monthName = format(new Date(targetYear, targetMonth - 1, 1), "MMMM yyyy");

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
      month: new Date(targetYear, targetMonth - 1, 1),
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
