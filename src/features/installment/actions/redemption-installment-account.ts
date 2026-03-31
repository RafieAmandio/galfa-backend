"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, installmentAccounts, mutations } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { calculateInstallmentValueWithRedemptions } from "@/lib/utils/installment-calculator-with-redemptions";

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

interface RedemptionHistory {
  id: number;
  amount: number;
  description: string | null;
  status: string;
  transactionDate: Date;
  createdAt: Date;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Process a redemption from an installment investment account
 */
export async function redeemInstallmentAccount(
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
    // Get account details with installment info
    const accountResult = await db
      .select({
        accountId: accounts.id,
        accountNumber: accounts.account_number,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        isRollover: accounts.is_rollover,
        userId: accounts.user_id,
        adminFee: installmentAccounts.admin_fee,
        monthlyCof: installmentAccounts.monthly_cof,
        investmentType: installmentAccounts.investment_type,
      })
      .from(accounts)
      .innerJoin(
        installmentAccounts,
        eq(accounts.id, installmentAccounts.account_id)
      )
      .where(eq(accounts.id, request.accountId))
      .limit(1);

    if (accountResult.length === 0) {
      return {
        success: false,
        message: "Account not found",
      };
    }

    const account = accountResult[0];

    // Check if account is redeemed/closed
    if (account.status === "redeemed" || account.status === "closed") {
      return {
        success: false,
        message: `Cannot redeem from ${account.status} account`,
      };
    }

    // Guard: redemption date must be within account date range
    if (request.redemptionDate < account.transactionDate) {
      return {
        success: false,
        message: `Redemption date cannot be before account start date (${account.transactionDate.toLocaleDateString()})`,
      };
    }
    if (account.endDate && request.redemptionDate > account.endDate) {
      return {
        success: false,
        message: `Redemption date cannot be after account end date (${account.endDate.toLocaleDateString()})`,
      };
    }

    // Calculate current account value with existing redemptions
    const grossCapital = Number(account.grossCapital);
    const adminFee = Number(account.adminFee);
    const netInvestorFund = grossCapital - adminFee;
    const monthlyCof = Number(account.monthlyCof);
    const investmentType = account.investmentType as
      | "principle"
      | "interest_only";

    const currentValue = await calculateInstallmentValueWithRedemptions(
      request.accountId,
      netInvestorFund,
      monthlyCof,
      investmentType,
      account.transactionDate,
      request.redemptionDate
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
          `Redemption from installment account ${account.accountNumber}`,
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
    console.error("Installment redemption error:", error);
    return {
      success: false,
      message: "Failed to process redemption. Please try again.",
    };
  }
}

/**
 * Get all redemption history for an installment account
 */
export async function getInstallmentAccountRedemptions(
  accountId: number
): Promise<RedemptionHistory[]> {
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
