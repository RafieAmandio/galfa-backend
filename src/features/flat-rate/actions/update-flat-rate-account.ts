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
    const { accountId, capital, annualRate, transactionDate, endDate, status } =
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

    // Update accounts table
    await db
      .update(accounts)
      .set(accountUpdate)
      .where(eq(accounts.id, accountId));

    // Update fixRateAccounts table if annualRate is provided
    if (annualRate !== undefined) {
      await db
        .update(fixRateAccounts)
        .set({
          annual_rate: annualRate.toString(),
          updated_at: new Date(),
        })
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
