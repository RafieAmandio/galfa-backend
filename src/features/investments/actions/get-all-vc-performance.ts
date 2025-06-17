"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { desc } from "drizzle-orm";

interface VCPerformanceRecord {
  id: number;
  date: Date;
  aum: number;
  profitTaken: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AllVCPerformanceResponse {
  success: boolean;
  data?: VCPerformanceRecord[];
  message: string;
}

export async function getAllVCPerformance(): Promise<AllVCPerformanceResponse> {
  try {
    const db = createDrizzleConnection();

    // Get all VC performance records ordered by date (newest first)
    const records = await db
      .select({
        id: vcPerformance.id,
        date: vcPerformance.date,
        aum: vcPerformance.aum,
        profitTaken: vcPerformance.profitTaken,
        createdAt: vcPerformance.created_at,
        updatedAt: vcPerformance.updated_at,
      })
      .from(vcPerformance)
      .orderBy(desc(vcPerformance.date));

    const vcPerformanceRecords: VCPerformanceRecord[] = records.map(
      (record) => ({
        id: record.id,
        date: record.date,
        aum: Number(record.aum),
        profitTaken: Number(record.profitTaken),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })
    );

    return {
      success: true,
      data: vcPerformanceRecords,
      message: `Successfully retrieved ${vcPerformanceRecords.length} VC performance records`,
    };
  } catch (error) {
    console.error("Error fetching all VC performance records:", error);
    return {
      success: false,
      message: "Failed to fetch VC performance records",
    };
  }
}
