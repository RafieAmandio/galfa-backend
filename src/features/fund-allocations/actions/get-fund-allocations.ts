"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { fundAllocations } from "@/db/drizzle/schema";
import { desc } from "drizzle-orm";

export type FundAllocation = {
  id: number;
  name: string;
  description: string | null;
  aum: number;
  rate_type: string;
  rate_value: number;
  rate_label: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function getFundAllocations(): Promise<{
  success: boolean;
  data?: FundAllocation[];
  error?: string;
}> {
  try {
    const db = createDrizzleConnection();

    const allocations = await db
      .select()
      .from(fundAllocations)
      .orderBy(desc(fundAllocations.aum));

    const formattedAllocations: FundAllocation[] = allocations.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      aum: parseFloat(a.aum),
      rate_type: a.rate_type,
      rate_value: parseFloat(a.rate_value),
      rate_label: a.rate_label,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));

    return {
      success: true,
      data: formattedAllocations,
    };
  } catch (error) {
    console.error("Error fetching fund allocations:", error);
    return {
      success: false,
      error: "Failed to fetch fund allocations",
    };
  }
}

export async function getFundAllocationsSummary(): Promise<{
  success: boolean;
  data?: {
    totalAum: number;
    totalAllocations: number;
    allocations: FundAllocation[];
  };
  error?: string;
}> {
  try {
    const result = await getFundAllocations();

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const totalAum = result.data.reduce((sum, a) => sum + a.aum, 0);

    return {
      success: true,
      data: {
        totalAum,
        totalAllocations: result.data.length,
        allocations: result.data,
      },
    };
  } catch (error) {
    console.error("Error fetching fund allocations summary:", error);
    return {
      success: false,
      error: "Failed to fetch fund allocations summary",
    };
  }
}
