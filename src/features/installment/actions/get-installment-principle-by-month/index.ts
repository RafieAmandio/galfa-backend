"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  installmentAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { cache } from "react";

interface MonthlyInstallmentPrincipleResult {
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
      monthlyCof: number;
      investmentType: "principle" | "interest_only";
      transactionDate: Date;
      endDate: Date | null;
    }>;
  };
}

/**
 * Get sum of all Net Investor Funds (after admin fees) for installment accounts for a specific month
 * This shows the total capital that was actively working for investors during that month
 * Includes all accounts that were active at any point during the target month
 */
export const getInstallmentPrincipleByMonth = cache(async function (
  targetMonth: Date
): Promise<MonthlyInstallmentPrincipleResult> {
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

    // Get all installment accounts that were active at any point during the specified month
    const monthlyAccounts = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        // Installment specific fields
        monthlyCof: installmentAccounts.monthly_cof,
        adminFee: installmentAccounts.admin_fee,
        investmentType: installmentAccounts.investment_type,
      })
      .from(accounts)
      .innerJoin(
        installmentAccounts,
        eq(accounts.id, installmentAccounts.account_id)
      )
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
        )
      )
      .orderBy(accounts.transaction_date);

    let totalGrossCapital = 0;
    let totalAdminFees = 0;
    let totalNetCapital = 0;

    const processedAccounts = monthlyAccounts.map((account) => {
      const grossAmount = parseFloat(account.grossCapital);
      const adminFeeRate = parseFloat(account.adminFee);

      // Calculate admin fee amount
      const adminFeeAmount = grossAmount * adminFeeRate;

      // Net capital is what was actually working for the investor
      const netAmount = grossAmount - adminFeeAmount;

      totalGrossCapital += grossAmount;
      totalAdminFees += adminFeeAmount;
      totalNetCapital += netAmount;

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        investorEmail: account.investorEmail,
        grossCapital: grossAmount,
        adminFee: adminFeeAmount,
        netCapital: netAmount,
        monthlyCof: parseFloat(account.monthlyCof),
        investmentType: account.investmentType as "principle" | "interest_only",
        transactionDate: account.transactionDate,
        endDate: account.endDate,
      };
    });

    return {
      success: true,
      message: `Successfully retrieved installment net capital (after admin fees) for ${format(
        monthStart,
        "MMMM yyyy"
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
    console.error("Get installment principle by month error:", error);
    return {
      success: false,
      message:
        "An error occurred while retrieving monthly installment capital data",
    };
  }
});
