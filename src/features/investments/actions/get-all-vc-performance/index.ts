"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { desc, sql } from "drizzle-orm";
import { cache } from "react";

interface VCPerformanceRecord {
  id: number;
  date: Date;
  aum: number;
  ihsgValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AllVCPerformanceResponse {
  success: boolean;
  data?: VCPerformanceRecord[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  message: string;
}

export const getAllVCPerformance = cache(
  async ({
    page = 1,
    pageSize = 12,
  }: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<AllVCPerformanceResponse> => {
    try {
      const db = createDrizzleConnection();

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vcPerformance);
      const totalCount = Number(countResult.count);

      // Get paginated records ordered by date (newest first)
      const records = await db
        .select({
          id: vcPerformance.id,
          date: vcPerformance.date,
          aum: vcPerformance.aum,
          ihsgValue: vcPerformance.ihsgValue,
          createdAt: vcPerformance.created_at,
          updatedAt: vcPerformance.updated_at,
        })
        .from(vcPerformance)
        .orderBy(desc(vcPerformance.date))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const vcPerformanceRecords: VCPerformanceRecord[] = records.map(
        (record) => ({
          id: record.id,
          date: record.date,
          aum: Number(record.aum),
          ihsgValue: record.ihsgValue ? Number(record.ihsgValue) : null,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
      );

      return {
        success: true,
        data: vcPerformanceRecords,
        totalCount,
        page,
        pageSize,
        message: `Successfully retrieved ${vcPerformanceRecords.length} performance records`,
      };
    } catch (error) {
      console.error("Error fetching all performance records:", error);
      return {
        success: false,
        message: "Failed to fetch performance records",
      };
    }
  }
);
