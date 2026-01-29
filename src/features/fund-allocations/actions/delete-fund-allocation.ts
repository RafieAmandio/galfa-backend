"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { fundAllocations } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export async function deleteFundAllocation(id: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const db = createDrizzleConnection();

    await db.delete(fundAllocations).where(eq(fundAllocations.id, id));

    return {
      success: true,
      message: "Fund allocation deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting fund allocation:", error);
    return {
      success: false,
      message: "Failed to delete fund allocation",
    };
  }
}
