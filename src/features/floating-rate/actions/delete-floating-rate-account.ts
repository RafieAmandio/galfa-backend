"use server";

import { zfd } from "zod-form-data";
import { z } from "zod";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, floatingRateAccounts, mutations } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export async function deleteFloatingRateAccount(
  prevState: any,
  formData: FormData
) {
  // const adminCheck = await checkAdminAccess();
  // if (!adminCheck.isAdmin) {
  //   return {
  //     success: false,
  //     message: "Unauthorized: Admin access required",
  //   };
  // }

  const validationResult = await zfd
    .formData({
      accountId: zfd.numeric(z.number().int().positive()),
    })
    .safeParseAsync(formData);

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

  const { accountId } = validationResult.data;

  try {
    const db = await createDrizzleConnection();

    // Verify the account exists and is a floating rate account
    const existingAccount = await db
      .select({
        id: accounts.id,
        account_number: accounts.account_number,
        user_id: accounts.user_id,
      })
      .from(accounts)
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (existingAccount.length === 0) {
      return {
        success: false,
        message: "Floating rate account not found",
      };
    }

    const account = existingAccount[0];

    // Perform cascading delete in order
    await db.delete(mutations).where(eq(mutations.account_id, accountId));

    await db
      .delete(floatingRateAccounts)
      .where(eq(floatingRateAccounts.account_id, accountId));

    await db.delete(accounts).where(eq(accounts.id, accountId));

    return {
      success: true,
      message: `Floating rate account ${account.account_number} and all related records have been successfully deleted`,
      data: {
        deletedAccountId: accountId,
        deletedAccountNumber: account.account_number,
      },
    };
  } catch (error) {
    console.error("Error deleting floating rate account:", error);
    return {
      success: false,
      message: "Failed to delete floating rate account",
      errors: [{ field: "general", message: "An unexpected error occurred" }],
    };
  }
}
