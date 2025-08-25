"use server";

import { zfd } from "zod-form-data";
import { z } from "zod";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { capitalMarketPerformance } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";

const deleteCapitalMarketPerformanceSchema = zfd.formData({
  performanceId: zfd.numeric(z.number().int().positive()),
});

export async function deleteCapitalMarketPerformance(
  prevState: any,
  formData: FormData
) {
  try {
    // 1. Authentication/Authorization (admin only)
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return {
        success: false,
        message: "Unauthorized: Admin access required",
        errors: [
          { field: "general", message: "You do not have permission to delete" },
        ],
      };
    }

    // 2. Validation
    const validationResult =
      await deleteCapitalMarketPerformanceSchema.safeParseAsync(formData);

    if (!validationResult.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      };
    }

    const { performanceId } = validationResult.data;

    // 3. Database operation
    const db = createDrizzleConnection();

    const deleted = await db
      .delete(capitalMarketPerformance)
      .where(eq(capitalMarketPerformance.id, performanceId))
      .returning();

    if (!deleted || deleted.length === 0) {
      return {
        success: false,
        message: "Performance record not found",
        errors: [{ field: "general", message: "Record does not exist" }],
      };
    }

    return {
      success: true,
      message: "Performance record deleted successfully",
      data: deleted[0],
    };
  } catch (error) {
    console.error("Error deleting capital market performance:", error);
    return {
      success: false,
      message: "Failed to delete performance record",
      errors: [{ field: "general", message: "An unexpected error occurred" }],
    };
  }
}
