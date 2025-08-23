"use server";

import { zfd } from "zod-form-data";
import { z } from "zod";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  capitalMarketPerformance,
  capitalMarketAccounts,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";

const createCapitalMarketPerformanceSchema = zfd.formData({
  userId: zfd.text(z.string().min(1)),
  performanceMonthYear: zfd.text(z.string().min(1)),
  totalInvested: zfd.numeric(z.number().min(0)),
  grossPerformance: zfd.numeric(z.number()),
  netPerformance: zfd.numeric(z.number()),
});

export async function createCapitalMarketPerformance(
  prevState: any,
  formData: FormData
) {
  try {
    // 1. Validation using zod-form-data
    const validationResult =
      await createCapitalMarketPerformanceSchema.safeParseAsync(formData);

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

    const {
      userId,
      performanceMonthYear,
      totalInvested,
      grossPerformance,
      netPerformance,
    } = validationResult.data;

    // 2. Business logic validation
    if (totalInvested <= 0) {
      return {
        success: false,
        message: "Total invested amount must be greater than 0",
        errors: [
          {
            field: "totalInvested",
            message: "Total invested amount must be greater than 0",
          },
        ],
      };
    }

    // 3. Convert month-year to specific date (15th of the month)
    const [year, month] = performanceMonthYear.split("-");
    const performanceDate = new Date(parseInt(year), parseInt(month) - 1, 15);

    // 4. Database operations
    const db = createDrizzleConnection();

    // Get the capital market account for the user
    const capitalMarketAccount = await db
      .select()
      .from(capitalMarketAccounts)
      .where(eq(capitalMarketAccounts.user_id, userId))
      .limit(1);

    if (!capitalMarketAccount || capitalMarketAccount.length === 0) {
      return {
        success: false,
        message: "Capital market account not found for this user",
        errors: [
          {
            field: "general",
            message: "Capital market account not found for this user",
          },
        ],
      };
    }

    // Check if a performance record already exists for this month and user
    const monthStart = startOfMonth(performanceDate);
    const monthEnd = endOfMonth(performanceDate);

    const existingPerformance = await db
      .select()
      .from(capitalMarketPerformance)
      .where(
        and(
          eq(
            capitalMarketPerformance.capital_market_account_id,
            capitalMarketAccount[0].id
          ),
          gte(capitalMarketPerformance.performance_date, monthStart),
          lte(capitalMarketPerformance.performance_date, monthEnd)
        )
      )
      .limit(1);

    if (existingPerformance && existingPerformance.length > 0) {
      return {
        success: false,
        message: "A performance record already exists for this month",
        errors: [
          {
            field: "performanceMonthYear",
            message:
              "A performance record already exists for this month. Only one record per month is allowed.",
          },
        ],
      };
    }

    // Create the performance record
    const [newPerformance] = await db
      .insert(capitalMarketPerformance)
      .values({
        capital_market_account_id: capitalMarketAccount[0].id,
        performance_date: performanceDate,
        total_invested: totalInvested.toString(),
        gross_performance: grossPerformance.toString(),
        net_performance: netPerformance.toString(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return {
      success: true,
      message: "Performance record created successfully",
      data: newPerformance,
    };
  } catch (error) {
    console.error("Error creating capital market performance:", error);
    return {
      success: false,
      message: "Failed to create performance record",
      errors: [{ field: "general", message: "An unexpected error occurred" }],
    };
  }
}
