"use server";

import { zfd } from "zod-form-data";
import { z } from "zod";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { capitalMarketAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

// Validation schema
const createCapitalMarketAccountSchema = zfd.formData({
  userId: zfd.text(z.string().uuid("Invalid user ID")),
});

export interface CreateCapitalMarketAccountResult {
  success: boolean;
  message: string;
  data?: {
    id: number;
    userId: string;
    createdAt: Date;
  };
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export async function createCapitalMarketAccount(
  prevState: any,
  formData: FormData
): Promise<CreateCapitalMarketAccountResult> {
  // 1. Admin Check
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  // 2. Validation using zod-form-data
  const validationResult =
    await createCapitalMarketAccountSchema.safeParseAsync(formData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    };
  }

  const { userId } = validationResult.data;

  try {
    // 3. Business logic validation
    // Check if user already has a capital market account
    const db = createDrizzleConnection();

    const existingAccount = await db
      .select()
      .from(capitalMarketAccounts)
      .where(eq(capitalMarketAccounts.user_id, userId))
      .limit(1);

    if (existingAccount.length > 0) {
      return {
        success: false,
        message: "User already has a capital market account",
        errors: [
          {
            field: "userId",
            message: "User already has a capital market account",
          },
        ],
      };
    }

    // 4. Database operations
    const now = new Date();
    const [newAccount] = await db
      .insert(capitalMarketAccounts)
      .values({
        user_id: userId,
        created_at: now,
        updated_at: now,
      })
      .returning({
        id: capitalMarketAccounts.id,
        userId: capitalMarketAccounts.user_id,
        createdAt: capitalMarketAccounts.created_at,
      });

    return {
      success: true,
      message: "Capital market account created successfully",
      data: newAccount,
    };
  } catch (error) {
    console.error("Error creating capital market account:", error);
    return {
      success: false,
      message: "Failed to create capital market account",
      errors: [{ field: "general", message: "An unexpected error occurred" }],
    };
  }
}
