"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { eq, sql, and, ne } from "drizzle-orm";
import { format } from "date-fns";

interface UpdateVCPerformanceRequest {
  id: number;
  date: Date;
  aum: number;
  profitTaken: number;
  ihsgValue?: number;
}

interface UpdateVCPerformanceResponse {
  success: boolean;
  data?: {
    id: number;
    date: Date;
    aum: number;
    profitTaken: number;
    ihsgValue: number | null;
  };
  message: string;
}

export async function updateVCPerformance(
  request: UpdateVCPerformanceRequest
): Promise<UpdateVCPerformanceResponse> {
  try {
    const db = createDrizzleConnection();
    const { id, date, aum, profitTaken, ihsgValue } = request;

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

    // Check if record exists
    const existingRecord = await db
      .select({
        id: vcPerformance.id,
        date: vcPerformance.date,
      })
      .from(vcPerformance)
      .where(eq(vcPerformance.id, id))
      .limit(1);

    if (existingRecord.length === 0) {
      return {
        success: false,
        message: "Performance record not found",
      };
    }

    const inputDate = new Date(date);
    const targetMonth = inputDate.getMonth() + 1;
    const targetYear = inputDate.getFullYear();

    // Check if another record already exists for this month (excluding current record)
    const conflictingRecords = await db
      .select({
        id: vcPerformance.id,
        date: vcPerformance.date,
      })
      .from(vcPerformance)
      .where(
        and(
          sql`extract(month from ${vcPerformance.date}) = ${targetMonth}`,
          sql`extract(year from ${vcPerformance.date}) = ${targetYear}`,
          ne(vcPerformance.id, id)
        )
      );

    if (conflictingRecords.length > 0) {
      const monthName = format(new Date(targetYear, targetMonth - 1, 1), "MMMM yyyy");
      return {
        success: false,
        message: `Another performance record already exists for ${monthName}. Each month should have only one record.`,
      };
    }

    // Store date as 1st of the month at noon UTC for consistency
    const normalizedDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 12, 0, 0));

    // Update the record
    const [updatedRecord] = await db
      .update(vcPerformance)
      .set({
        date: normalizedDate,
        aum: aum.toString(),
        profitTaken: profitTaken.toString(),
        ihsgValue: ihsgValue !== undefined ? ihsgValue.toString() : null,
        updated_at: new Date(),
      })
      .where(eq(vcPerformance.id, id))
      .returning({
        id: vcPerformance.id,
        date: vcPerformance.date,
        aum: vcPerformance.aum,
        profitTaken: vcPerformance.profitTaken,
        ihsgValue: vcPerformance.ihsgValue,
      });

    return {
      success: true,
      data: {
        id: updatedRecord.id,
        date: updatedRecord.date,
        aum: Number(updatedRecord.aum),
        profitTaken: Number(updatedRecord.profitTaken),
        ihsgValue: updatedRecord.ihsgValue ? Number(updatedRecord.ihsgValue) : null,
      },
      message: `Successfully updated performance record for ${format(
        new Date(targetYear, targetMonth - 1, 1),
        "MMMM yyyy"
      )}`,
    };
  } catch (error) {
    console.error("Error updating performance record:", error);
    return {
      success: false,
      message: "Failed to update performance record",
    };
  }
}
