"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  mutations,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { startOfMonth, endOfMonth } from "date-fns";

interface MonthlyOutflowResult {
  success: boolean;
  message: string;
  data?: {
    month: Date;
    totalOutflow: number; // Total amount redeemed/paid out
    fixRateOutflow: number; // Outflow from fixed rate accounts
    floatingRateOutflow: number; // Outflow from floating rate accounts
    installmentOutflow: number; // Outflow from installment accounts
    outflowCount: number; // Total number of outflow transactions
    outflowTransactions: Array<{
      id: number;
      accountId: number;
      accountNumber: string;
      accountType: "fixed_rate" | "floating_rate" | "installment";
      investorEmail: string | null;
      investorName: string | null;
      amount: number;
      transactionDate: Date;
      description: string | null;
      redemptionType: "partial" | "full" | "scheduled"; // For categorizing redemptions
      isRollover: boolean | null;
    }>;
  };
}

/**
 * Get monthly outflow across all investment account types
 * Tracks redemptions, payments, and outflows from fixed rate, floating rate, and installment accounts
 * Uses mutations table as single source of truth for all completed outflow transactions
 */
export async function getOutflowByMonth(
  targetMonth: Date
): Promise<MonthlyOutflowResult> {
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
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    // Get all redemption/outflow mutations for the target month
    // This includes:
    // - Partial/full redemptions from fixed & floating rate accounts
    // - Scheduled payments from installment accounts
    // - Maturity payments from all account types
    const outflowMutations = await db
      .select({
        mutationId: mutations.id,
        accountId: accounts.id,
        accountNumber: accounts.account_number,
        accountTypeId: accounts.account_type_id,
        investorEmail: authUsers.email,
        investorName: profiles.full_name,
        amount: mutations.amount,
        transactionDate: mutations.transaction_date,
        description: mutations.description,
        mutationType: mutations.type,
        mutationStatus: mutations.status,
        isRollover: accounts.is_rollover,
        accountStatus: accounts.status,
        // Join with specific account type tables to determine type
        fixRateId: fixRateAccounts.id,
        floatingRateId: floatingRateAccounts.id,
        installmentId: installmentAccounts.id,
      })
      .from(mutations)
      .innerJoin(accounts, eq(mutations.account_id, accounts.id))
      .leftJoin(profiles, eq(accounts.user_id, profiles.id))
      .leftJoin(authUsers, eq(profiles.id, authUsers.id))
      .leftJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .leftJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .leftJoin(
        installmentAccounts,
        eq(accounts.id, installmentAccounts.account_id)
      )
      .where(
        and(
          gte(mutations.transaction_date, monthStart),
          lte(mutations.transaction_date, monthEnd),
          // Include all outbound transaction types
          or(
            eq(mutations.type, "redemption"), // Standard redemptions
            eq(mutations.type, "outbound"), // General outflows
            eq(mutations.type, "payment"), // Installment payments
            eq(mutations.type, "maturity_payment") // Maturity payments
          ),
          eq(mutations.status, "completed") // Only completed transactions
        )
      )
      .orderBy(mutations.transaction_date);

    // Process and categorize outflow transactions
    const processedTransactions = outflowMutations.map((mutation) => {
      // Determine account type
      let accountType: "fixed_rate" | "floating_rate" | "installment";
      if (mutation.fixRateId) {
        accountType = "fixed_rate";
      } else if (mutation.floatingRateId) {
        accountType = "floating_rate";
      } else if (mutation.installmentId) {
        accountType = "installment";
      } else {
        accountType = "fixed_rate"; // Default fallback
      }

      // Determine redemption type based on transaction details
      let redemptionType: "partial" | "full" | "scheduled";
      if (accountType === "installment") {
        redemptionType = "scheduled"; // Installments are always scheduled
      } else if (
        mutation.accountStatus === "redeemed" ||
        mutation.accountStatus === "closed"
      ) {
        redemptionType = "full"; // Account was closed after this transaction
      } else {
        redemptionType = "partial"; // Account remains active
      }

      return {
        id: mutation.mutationId,
        accountId: mutation.accountId,
        accountNumber: mutation.accountNumber,
        accountType,
        investorEmail: mutation.investorEmail,
        investorName: mutation.investorName,
        amount: Number(mutation.amount),
        transactionDate: mutation.transactionDate,
        description: mutation.description,
        redemptionType,
        isRollover: mutation.isRollover,
      };
    });

    // Calculate totals by account type
    const fixRateOutflow = processedTransactions
      .filter((t) => t.accountType === "fixed_rate")
      .reduce((sum, t) => sum + t.amount, 0);

    const floatingRateOutflow = processedTransactions
      .filter((t) => t.accountType === "floating_rate")
      .reduce((sum, t) => sum + t.amount, 0);

    const installmentOutflow = processedTransactions
      .filter((t) => t.accountType === "installment")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalOutflow =
      fixRateOutflow + floatingRateOutflow + installmentOutflow;

    return {
      success: true,
      message: `Successfully retrieved outflow data for ${monthStart.toLocaleDateString(
        "id-ID",
        { year: "numeric", month: "long" }
      )}`,
      data: {
        month: monthStart,
        totalOutflow,
        fixRateOutflow,
        floatingRateOutflow,
        installmentOutflow,
        outflowCount: processedTransactions.length,
        outflowTransactions: processedTransactions,
      },
    };
  } catch (error) {
    console.error("Get monthly outflow error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving outflow data",
    };
  }
}
