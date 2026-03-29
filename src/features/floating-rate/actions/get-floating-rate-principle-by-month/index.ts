"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  accountTypes,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import { startOfMonth, endOfMonth } from "date-fns";
import { cache } from "react";

interface FloatingRatePrincipleData {
  month: Date;
  totalGrossCapital: number;
  totalAdminFees: number;
  totalNetCapital: number;
  activeAccountsCount: number;
  accounts: Array<{
    id: number;
    accountNumber: string;
    investorEmail: string | null;
    grossCapital: number;
    adminFee: number;
    netCapital: number;
    transactionDate: Date;
  }>;
}

interface FloatingRatePrincipleResult {
  success: boolean;
  message: string;
  data?: FloatingRatePrincipleData;
}

/**
 * Get floating rate principle (net capital) data for a specific month
 * Shows total net capital working for floating rate investments
 */
export const getFloatingRatePrincipleByMonth = cache(async function (
  month: Date
): Promise<FloatingRatePrincipleResult> {
  // Check admin access
  // const adminCheck = await checkAdminAccess();
  // if (!adminCheck.isAdmin) {
  //   return {
  //     success: false,
  //     message: "Unauthorized: Admin access required",
  //   };
  // }

  const db = createDrizzleConnection();

  try {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // Get all floating rate accounts that were active during the specified month
    const results = await db
      .select({
        // Account info
        accountId: accounts.id,
        accountNumber: accounts.account_number,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,

        // Investor info
        investorEmail: authUsers.email,

        // Floating rate specific info
        adminFee: floatingRateAccounts.admin_fee,
      })
      .from(accounts)
      .innerJoin(accountTypes, eq(accounts.account_type_id, accountTypes.id))
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .leftJoin(profiles, eq(accounts.user_id, profiles.id))
      .leftJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(
        and(
          eq(accountTypes.name, "floating"),
          // Investment started before or during the month
          lte(accounts.transaction_date, monthEnd),
          // Investment either has no end date or ended after the month started
          // (this checks if the account was active during the month, regardless of current status)
          or(isNull(accounts.end_date), gte(accounts.end_date, monthStart))
        )
      )
      .orderBy(accounts.transaction_date);

    // Process the results
    const processedAccounts = results.map((result) => {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFee = parseFloat(result.adminFee);
      const netCapital = grossCapital - adminFee;

      return {
        id: result.accountId,
        accountNumber: result.accountNumber,
        investorEmail: result.investorEmail,
        grossCapital,
        adminFee,
        netCapital,
        transactionDate: result.transactionDate,
      };
    });

    // Calculate totals
    const totalGrossCapital = processedAccounts.reduce(
      (sum, account) => sum + account.grossCapital,
      0
    );
    const totalAdminFees = processedAccounts.reduce(
      (sum, account) => sum + account.adminFee,
      0
    );
    const totalNetCapital = processedAccounts.reduce(
      (sum, account) => sum + account.netCapital,
      0
    );

    const data: FloatingRatePrincipleData = {
      month,
      totalGrossCapital,
      totalAdminFees,
      totalNetCapital,
      activeAccountsCount: processedAccounts.length,
      accounts: processedAccounts,
    };

    return {
      success: true,
      message: `Successfully retrieved floating rate principle data for ${processedAccounts.length} accounts`,
      data,
    };
  } catch (error) {
    console.error("Get floating rate principle by month error:", error);
    return {
      success: false,
      message:
        "An error occurred while retrieving floating rate principle data",
    };
  }
});
