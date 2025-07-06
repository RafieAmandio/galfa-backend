"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { and, gte, lt } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";

interface CreateVCPerformanceRequest {
  date: Date;
  aum: number;
  profitTaken: number;
}

interface CreateVCPerformanceResponse {
  success: boolean;
  data?: {
    id: number;
    date: Date;
    aum: number;
    profitTaken: number;
  };
  message: string;
}

export async function createVCPerformance(
  request: CreateVCPerformanceRequest
): Promise<CreateVCPerformanceResponse> {
  try {
    const db = createDrizzleConnection();
    const { date, aum, profitTaken } = request;

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

    // Check if record already exists for this month
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const existingRecords = await db
      .select({
        id: vcPerformance.id,
        date: vcPerformance.date,
      })
      .from(vcPerformance)
      .where(
        and(
          gte(vcPerformance.date, monthStart),
          lt(vcPerformance.date, monthEnd)
        )
      );

    if (existingRecords.length > 0) {
      const monthName = monthStart.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      return {
        success: false,
        message: `A performance record already exists for ${monthName}. Each month should have only one record.`,
      };
    }

    // Create the new record
    const [newRecord] = await db
      .insert(vcPerformance)
      .values({
        date,
        aum: aum.toString(),
        profitTaken: profitTaken.toString(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({
        id: vcPerformance.id,
        date: vcPerformance.date,
        aum: vcPerformance.aum,
        profitTaken: vcPerformance.profitTaken,
      });

    return {
      success: true,
      data: {
        id: newRecord.id,
        date: newRecord.date,
        aum: Number(newRecord.aum),
        profitTaken: Number(newRecord.profitTaken),
      },
      message: `Successfully created performance record for ${monthStart.toLocaleDateString(
        "en-US",
        { year: "numeric", month: "long" }
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
