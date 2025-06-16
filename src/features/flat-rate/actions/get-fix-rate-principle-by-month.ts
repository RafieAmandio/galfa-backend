"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";
import { startOfMonth, endOfMonth } from "date-fns";

interface MonthlyPrincipleResult {
  success: boolean;
  message: string;
  data?: {
    month: Date;
    totalGrossCapital: number;
    totalAdminFees: number;
    totalNetCapital: number; // Net investor funds after admin fees
    activeAccountsCount: number;
    accounts: Array<{
      id: number;
      accountNumber: string;
      investorEmail: string | null;
      grossCapital: number;
      adminFee: number;
      netCapital: number;
      transactionDate: Date;
      isRollover: boolean | null;
    }>;
  };
}

/**
 * Get sum of all Net Investor Funds (after admin fees) for a specific month
 * This shows the total capital that was actively working for investors during that month
 * Includes all accounts that were active at any point during the target month
 *
 * Important: Parent accounts are excluded when rollover children exist to avoid double-counting.
 * Only the active rollover account capital is counted, not the original parent account.
 */
export async function getFixRatePrincipleByMonth(
  targetMonth: Date
): Promise<MonthlyPrincipleResult> {
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

    // Get all fixed rate accounts that were active at any point during the specified month
    // This includes accounts that started, ended, or were running throughout the month
    const allMonthlyAccounts = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
        status: accounts.status,
        parentAccountId: accounts.parent_account_id,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(
        and(
          // Account was created before or during the month
          lte(accounts.transaction_date, monthEnd),
          // Account was active during the month (either no end date or ended after month start)
          accounts.end_date === null
            ? undefined
            : gte(accounts.end_date, monthStart)
          // Include all accounts that were active during the month (active, mature, closed)
          // Don't filter by status since we want to see what capital was working during that month
        )
      )
      .orderBy(accounts.transaction_date);

    // Filter out parent accounts that have rollover children to avoid double counting
    const parentAccountIds = new Set(
      allMonthlyAccounts
        .filter((account) => account.isRollover && account.parentAccountId)
        .map((account) => account.parentAccountId!)
    );

    const monthlyAccounts = allMonthlyAccounts.filter(
      (account) => !parentAccountIds.has(account.id)
    );

    let totalGrossCapital = 0;
    let totalAdminFees = 0;
    let totalNetCapital = 0;

    const processedAccounts = monthlyAccounts.map((account) => {
      const grossAmount = parseFloat(account.grossCapital);
      let adminFee = 0;

      // Calculate admin fee based on rollover status
      // Rollover accounts don't have admin fees deducted since they were already paid on the original investment
      if (account.isRollover) {
        adminFee = 0; // No admin fee for rollovers
      } else if (account.adminFeeApplied) {
        // Original investments have 5% admin fee deducted from gross capital
        adminFee = grossAmount * ADMIN_FEE_PERCENTAGE;
      }

      // Net capital is what was actually working for the investor during this month
      const netAmount = grossAmount - adminFee;

      totalGrossCapital += grossAmount;
      totalAdminFees += adminFee;
      totalNetCapital += netAmount;

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        investorEmail: account.investorEmail,
        grossCapital: grossAmount,
        adminFee,
        netCapital: netAmount,
        transactionDate: account.transactionDate,
        isRollover: account.isRollover,
      };
    });

    return {
      success: true,
      message: `Successfully retrieved net capital (after admin fees) for ${monthStart.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      )}`,
      data: {
        month: monthStart,
        totalGrossCapital,
        totalAdminFees,
        totalNetCapital,
        activeAccountsCount: processedAccounts.length,
        accounts: processedAccounts,
      },
    };
  } catch (error) {
    console.error("Get fix rate principle by month error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving monthly net capital data",
    };
  }
}
