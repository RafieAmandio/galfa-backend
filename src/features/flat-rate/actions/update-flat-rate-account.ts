"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

interface UpdateFlatRateAccountRequest {
  accountId: number;
  capital?: number;
  annualRate?: number;
  transactionDate?: Date;
  endDate?: Date;
  status?: string;
  adminFeePercentage?: number;
}

interface UpdateFlatRateAccountResponse {
  success: boolean;
  message: string;
}

export async function updateFlatRateAccount(
  request: UpdateFlatRateAccountRequest
): Promise<UpdateFlatRateAccountResponse> {
  try {
    const db = createDrizzleConnection();
    const { accountId, capital, annualRate, transactionDate, endDate, status, adminFeePercentage } =
      request;

    // Check if account exists
    const existingAccount = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (existingAccount.length === 0) {
      return {
        success: false,
        message: "Account not found",
      };
    }

    // Build accounts update payload
    const accountUpdate: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (capital !== undefined) {
      accountUpdate.capital = capital.toString();
    }
    if (transactionDate !== undefined) {
      accountUpdate.transaction_date = transactionDate;
    }
    if (endDate !== undefined) {
      accountUpdate.end_date = endDate;
    }
    if (status !== undefined) {
      accountUpdate.status = status;
    }
    if (adminFeePercentage !== undefined) {
      const adminFeeRate = adminFeePercentage / 100;
      accountUpdate.admin_fee_applied = adminFeeRate > 0;
    }

    // Update accounts table
    await db
      .update(accounts)
      .set(accountUpdate)
      .where(eq(accounts.id, accountId));

    // Update fixRateAccounts table if annualRate or adminFeePercentage is provided
    const fixRateUpdate: Record<string, unknown> = { updated_at: new Date() };
    let hasFixRateUpdate = false;

    if (annualRate !== undefined) {
      fixRateUpdate.annual_rate = annualRate.toString();
      hasFixRateUpdate = true;
    }
    if (adminFeePercentage !== undefined) {
      fixRateUpdate.admin_fee = (adminFeePercentage / 100).toString();
      hasFixRateUpdate = true;
    }

    if (hasFixRateUpdate) {
      await db
        .update(fixRateAccounts)
        .set(fixRateUpdate)
        .where(eq(fixRateAccounts.account_id, accountId));
    }

    return {
      success: true,
      message: "Successfully updated flat rate account",
    };
  } catch (error) {
    console.error("Error updating flat rate account:", error);
    return {
      success: false,
      message: "Failed to update flat rate account",
    };
  }
}
