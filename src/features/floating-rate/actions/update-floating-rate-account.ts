"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, floatingRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

interface UpdateFloatingRateAccountRequest {
  accountId: number;
  capital?: number;
  adminFee?: number;
  transactionDate?: Date;
  endDate?: Date;
  status?: string;
}

interface UpdateFloatingRateAccountResult {
  success: boolean;
  message: string;
}

export async function updateFloatingRateAccount(
  request: UpdateFloatingRateAccountRequest
): Promise<UpdateFloatingRateAccountResult> {
  const db = createDrizzleConnection();

  try {
    // Verify the account exists and is a floating rate account
    const existingAccount = await db
      .select({
        id: accounts.id,
        account_number: accounts.account_number,
        floatingRateId: floatingRateAccounts.id,
      })
      .from(accounts)
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .where(eq(accounts.id, request.accountId))
      .limit(1);

    if (existingAccount.length === 0) {
      return {
        success: false,
        message: "Floating rate account not found",
      };
    }

    const now = new Date();

    // Update accounts table fields
    const accountUpdates: Record<string, any> = {
      updated_at: now,
    };

    if (request.capital !== undefined) {
      accountUpdates.capital = request.capital.toString();
    }
    if (request.transactionDate !== undefined) {
      accountUpdates.transaction_date = request.transactionDate;
    }
    if (request.endDate !== undefined) {
      accountUpdates.end_date = request.endDate;
    }
    if (request.status !== undefined) {
      accountUpdates.status = request.status;
    }

    await db
      .update(accounts)
      .set(accountUpdates)
      .where(eq(accounts.id, request.accountId));

    // Update floatingRateAccounts table if adminFee provided
    if (request.adminFee !== undefined) {
      await db
        .update(floatingRateAccounts)
        .set({
          admin_fee: request.adminFee.toString(),
          updated_at: now,
        })
        .where(eq(floatingRateAccounts.account_id, request.accountId));
    }

    return {
      success: true,
      message: `Floating rate account ${existingAccount[0].account_number} updated successfully`,
    };
  } catch (error) {
    console.error("Error updating floating rate account:", error);
    return {
      success: false,
      message: "Failed to update floating rate account",
    };
  }
}
