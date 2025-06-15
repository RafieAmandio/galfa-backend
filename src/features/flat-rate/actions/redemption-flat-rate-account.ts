"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts, mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { checkAdminAccess } from "@/lib/auth/admin-check";

interface RedemptionRequest {
  accountId: number;
  redemptionAmount: number;
  redemptionDate: Date;
  description?: string;
}

interface RedemptionResult {
  success: boolean;
  message: string;
  mutationId?: number;
  currentAccountValue?: number;
  remainingBalance?: number;
}

export async function redeemFlatRateAccount(
  request: RedemptionRequest
): Promise<RedemptionResult> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  const db = createDrizzleConnection();

  try {
    // Get account details with fix rate info
    const accountResult = await db
      .select({
        accountId: accounts.id,
        accountNumber: accounts.account_number,
        capital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
        userId: accounts.user_id,
        annualRate: fixRateAccounts.annual_rate,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .where(eq(accounts.id, request.accountId))
      .limit(1);

    if (accountResult.length === 0) {
      return {
        success: false,
        message: "Account not found",
      };
    }

    const account = accountResult[0];

    // Check if account is active
    if (account.status !== "active") {
      return {
        success: false,
        message: `Cannot redeem from ${account.status} account`,
      };
    }

    // Calculate current account value (NPV) with redemptions
    const currentValue = await calculateNetPresentValueWithRedemptions(
      request.accountId,
      Number(account.capital),
      Number(account.annualRate),
      account.transactionDate,
      request.redemptionDate,
      account.isRollover || false,
      account.adminFeeApplied !== false
    );

    // Validate redemption amount
    if (request.redemptionAmount <= 0) {
      return {
        success: false,
        message: "Redemption amount must be greater than zero",
      };
    }

    if (request.redemptionAmount > currentValue.currentValue) {
      return {
        success: false,
        message: `Redemption amount (${formatCurrency(
          request.redemptionAmount
        )}) exceeds current account value (${formatCurrency(
          currentValue.currentValue
        )})`,
      };
    }

    // Calculate remaining balance after redemption
    const remainingBalance =
      currentValue.currentValue - request.redemptionAmount;
    const isFullRedemption = remainingBalance < 1000; // Consider amounts < Rp 1,000 as full redemption

    // Create redemption mutation record
    const mutationResult = await db
      .insert(mutations)
      .values({
        account_id: request.accountId,
        type: "redemption",
        amount: request.redemptionAmount.toString(),
        description:
          request.description ||
          `Redemption from account ${account.accountNumber}`,
        status: "completed",
        transaction_date: request.redemptionDate,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: mutations.id });

    // Update account status if it's a full redemption
    if (isFullRedemption) {
      await db
        .update(accounts)
        .set({
          status: "redeemed",
          updated_at: new Date(),
        })
        .where(eq(accounts.id, request.accountId));
    }

    return {
      success: true,
      message: isFullRedemption
        ? `Full redemption of ${formatCurrency(
            request.redemptionAmount
          )} completed. Account closed.`
        : `Partial redemption of ${formatCurrency(
            request.redemptionAmount
          )} completed.`,
      mutationId: mutationResult[0].id,
      currentAccountValue: currentValue.currentValue,
      remainingBalance: isFullRedemption ? 0 : remainingBalance,
    };
  } catch (error) {
    console.error("Redemption error:", error);
    return {
      success: false,
      message: "Failed to process redemption. Please try again.",
    };
  }
}

/**
 * Get all redemption history for an account
 */
export async function getAccountRedemptions(accountId: number) {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const db = createDrizzleConnection();

  const redemptions = await db
    .select({
      id: mutations.id,
      amount: mutations.amount,
      description: mutations.description,
      status: mutations.status,
      transactionDate: mutations.transaction_date,
      createdAt: mutations.created_at,
    })
    .from(mutations)
    .where(
      and(eq(mutations.account_id, accountId), eq(mutations.type, "redemption"))
    )
    .orderBy(mutations.transaction_date);

  return redemptions.map((redemption) => ({
    ...redemption,
    amount: Number(redemption.amount),
  }));
}

/**
 * Get total redemptions for an account
 */
export async function getAccountTotalRedemptions(
  accountId: number
): Promise<number> {
  const redemptions = await getAccountRedemptions(accountId);
  return redemptions
    .filter((r) => r.status === "completed")
    .reduce((total, r) => total + r.amount, 0);
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}
