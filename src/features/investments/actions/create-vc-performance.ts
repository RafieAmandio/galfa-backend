"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { sql, and } from "drizzle-orm";
import { format } from "date-fns";

interface CreateVCPerformanceRequest {
  date: Date;
  aum: number;
  profitTaken: number;
  ihsgValue?: number;
  monthlyGrossRoi?: number;
  monthlyNettRoi?: number;
}

interface CreateVCPerformanceResponse {
  success: boolean;
  data?: {
    id: number;
    date: Date;
    aum: number;
    profitTaken: number;
    ihsgValue: number | null;
    monthlyGrossRoi: number | null;
    monthlyNettRoi: number | null;
  };
  message: string;
}

export async function createVCPerformance(
  request: CreateVCPerformanceRequest
): Promise<CreateVCPerformanceResponse> {
  try {
    const db = createDrizzleConnection();
    const { date, aum, profitTaken, ihsgValue, monthlyGrossRoi, monthlyNettRoi } = request;

    // Validation
    if (!date) {
      return {
        success: false,
        message: "Date is required",
      };
    }

    if (aum < 0) {
      return {
        success: false,
        message: "Assets Under Management cannot be negative",
      };
    }

    if (profitTaken < 0) {
      return {
        success: false,
        message: "Profit Taken cannot be negative",
      };
    }

    // Normalize date to 1st of month at noon UTC to avoid timezone issues
    const inputDate = new Date(date);
    const targetMonth = inputDate.getMonth() + 1; // 1-based
    const targetYear = inputDate.getFullYear();

    // Check if record already exists for this month using extract for timezone safety
    const existingRecords = await db
      .select({
        id: vcPerformance.id,
        date: vcPerformance.date,
      })
      .from(vcPerformance)
      .where(
        and(
          sql`extract(month from ${vcPerformance.date}) = ${targetMonth}`,
          sql`extract(year from ${vcPerformance.date}) = ${targetYear}`
        )
      );

    if (existingRecords.length > 0) {
      const monthName = format(new Date(targetYear, targetMonth - 1, 1), "MMMM yyyy");
      return {
        success: false,
        message: `A performance record already exists for ${monthName}. Each month should have only one record.`,
      };
    }

    // Store date as 1st of the month at noon UTC for consistency
    const normalizedDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 12, 0, 0));

    // Create the new record
    const [newRecord] = await db
      .insert(vcPerformance)
      .values({
        date: normalizedDate,
        aum: aum.toString(),
        profitTaken: profitTaken.toString(),
        ihsgValue: ihsgValue !== undefined ? ihsgValue.toString() : null,
        monthlyGrossRoi: monthlyGrossRoi !== undefined ? monthlyGrossRoi.toString() : null,
        monthlyNettRoi: monthlyNettRoi !== undefined ? monthlyNettRoi.toString() : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({
        id: vcPerformance.id,
        date: vcPerformance.date,
        aum: vcPerformance.aum,
        profitTaken: vcPerformance.profitTaken,
        ihsgValue: vcPerformance.ihsgValue,
        monthlyGrossRoi: vcPerformance.monthlyGrossRoi,
        monthlyNettRoi: vcPerformance.monthlyNettRoi,
      });

    return {
      success: true,
      data: {
        id: newRecord.id,
        date: newRecord.date,
        aum: Number(newRecord.aum),
        profitTaken: Number(newRecord.profitTaken),
        ihsgValue: newRecord.ihsgValue ? Number(newRecord.ihsgValue) : null,
        monthlyGrossRoi: newRecord.monthlyGrossRoi ? Number(newRecord.monthlyGrossRoi) : null,
        monthlyNettRoi: newRecord.monthlyNettRoi ? Number(newRecord.monthlyNettRoi) : null,
      },
      message: `Successfully created performance record for ${format(
        new Date(targetYear, targetMonth - 1, 1),
        "MMMM yyyy"
      )}`,
    };
  } catch (error) {
    console.error("Error creating performance record:", error);
    return {
      success: false,
      message: "Failed to create performance record",
    };
  }
}
