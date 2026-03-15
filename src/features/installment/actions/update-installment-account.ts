"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, installmentAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

interface UpdateInstallmentAccountRequest {
  accountId: number;
  capital?: number;
  monthlyCof?: number;
  investmentType?: string;
  transactionDate?: Date;
  endDate?: Date;
  status?: string;
}

interface UpdateInstallmentAccountResponse {
  success: boolean;
  message: string;
}

export async function updateInstallmentAccount(
  request: UpdateInstallmentAccountRequest
): Promise<UpdateInstallmentAccountResponse> {
  try {
    const db = createDrizzleConnection();
    const { accountId, capital, monthlyCof, investmentType, transactionDate, endDate, status } = request;

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

    // Build accounts table update
    const accountUpdate: Record<string, any> = {
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

    // Update installment accounts table if relevant fields provided
    if (monthlyCof !== undefined || investmentType !== undefined) {
      const installmentUpdate: Record<string, any> = {
        updated_at: new Date(),
      };

      if (monthlyCof !== undefined) {
        installmentUpdate.monthly_cof = monthlyCof.toString();
      }
      if (investmentType !== undefined) {
        installmentUpdate.investment_type = investmentType;
      }

      await db
        .update(installmentAccounts)
        .set(installmentUpdate)
        .where(eq(installmentAccounts.account_id, accountId));
    }

    return {
      success: true,
      message: "Installment account updated successfully",
    };
  } catch (error) {
    console.error("Error updating installment account:", error);
    return {
      success: false,
      message: "Failed to update installment account",
    };
  }
}
