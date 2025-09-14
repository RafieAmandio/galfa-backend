"use server";

import { zfd } from "zod-form-data";
import { z } from "zod";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, installmentAccounts, mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function deleteInstallmentAccount(
  prevState: any,
  formData: FormData
) {
  // 1. Admin Check
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  // 2. Validation using zod-form-data
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

    // 3. Verify the account exists and is an installment account
    const existingAccount = await db
      .select({
        id: accounts.id,
        account_number: accounts.account_number,
        user_id: accounts.user_id,
      })
      .from(accounts)
      .innerJoin(
        installmentAccounts,
        eq(accounts.id, installmentAccounts.account_id)
      )
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (existingAccount.length === 0) {
      return {
        success: false,
        message: "Installment account not found",
      };
    }

    const account = existingAccount[0];

    // 4. Perform cascading delete in the correct order
    // First delete mutations (they reference accounts)
    await db.delete(mutations).where(eq(mutations.account_id, accountId));

    // Then delete installment account record
    await db
      .delete(installmentAccounts)
      .where(eq(installmentAccounts.account_id, accountId));

    // Finally delete the main account record
    await db.delete(accounts).where(eq(accounts.id, accountId));

    return {
      success: true,
      message: `Installment account ${account.account_number} and all related records have been successfully deleted`,
      data: {
        deletedAccountId: accountId,
        deletedAccountNumber: account.account_number,
      },
    };
  } catch (error) {
    console.error("Error deleting installment account:", error);
    return {
      success: false,
      message: "Failed to delete installment account",
      errors: [{ field: "general", message: "An unexpected error occurred" }],
    };
  }
}
