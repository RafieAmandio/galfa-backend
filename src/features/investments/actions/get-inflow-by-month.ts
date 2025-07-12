"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface MonthlyInflowResult {
  success: boolean;
  message: string;
  data?: {
    month: Date;
    totalNewInvestments: number; // Gross capital of new investments
    totalAdminFeesCollected: number; // Admin fees from new investments
    totalNetInflowFunds: number; // Net capital working for investors (after admin fees)
    newAccountsCount: number; // Number of new original accounts created
    newInvestments: Array<{
      id: number;
      accountNumber: string;
      accountType: "fixed_rate" | "floating_rate" | "installment";
      investorEmail: string | null;
      investorName: string | null;
      grossCapital: number;
      adminFee: number;
      netCapital: number;
      rate: number; // Annual rate for fixed/floating, monthly CoF for installment
      rateType: string; // Description of rate type
      transactionDate: Date;
      endDate: Date | null;
    }>;
  };
}

/**
 * Get monthly inflow of new investor funds across all account types
 * This tracks actual NEW money invested (excludes rollover accounts)
 * Includes fixed rate, floating rate, and installment accounts
 * Shows how much fresh capital came into the platform during the target month
 */
export async function getInflowByMonth(
  targetMonth: Date
): Promise<MonthlyInflowResult> {
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

    // Get all NEW accounts created during the target month (all account types)
    // Excludes rollover accounts since they don't represent new investor funds
    const newInvestments = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
        investorName: profiles.full_name,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
        status: accounts.status,
        // Account type specific rates
        fixRateAnnualRate: fixRateAccounts.annual_rate,
        floatingRateAdminFee: floatingRateAccounts.admin_fee,
        installmentMonthlyCoF: installmentAccounts.monthly_cof,
        installmentAdminFee: installmentAccounts.admin_fee,
        installmentInvestmentType: installmentAccounts.investment_type,
      })
      .from(accounts)
      .leftJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .leftJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .leftJoin(
        installmentAccounts,
        eq(accounts.id, installmentAccounts.account_id)
      )
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(
        and(
          // Account was created during the target month
          gte(accounts.transaction_date, monthStart),
          lte(accounts.transaction_date, monthEnd),
          // Only original investments (exclude rollovers - they're not new money)
          eq(accounts.is_rollover, false)
        )
      )
      .orderBy(accounts.transaction_date);

    let totalNewInvestments = 0;
    let totalAdminFeesCollected = 0;
    let totalNetInflowFunds = 0;

    const processedInvestments = newInvestments.map((investment) => {
      const grossAmount = parseFloat(investment.grossCapital);

      // Determine account type and rate info
      let accountType: "fixed_rate" | "floating_rate" | "installment";
      let rate: number;
      let rateType: string;

      if (investment.fixRateAnnualRate !== null) {
        accountType = "fixed_rate";
        rate = parseFloat(investment.fixRateAnnualRate);
        rateType = "Annual Rate";
      } else if (investment.floatingRateAdminFee !== null) {
        accountType = "floating_rate";
        rate = 0; // Floating rate doesn't have a fixed rate, it's performance-based
        rateType = "Variable Rate";
      } else if (investment.installmentMonthlyCoF !== null) {
        accountType = "installment";
        rate = parseFloat(investment.installmentMonthlyCoF);
        rateType = "Monthly CoF";
      } else {
        // Fallback - shouldn't happen with proper data
        accountType = "fixed_rate";
        rate = 0;
        rateType = "Unknown";
      }

      // Calculate admin fee based on account type
      let adminFee = 0;
      if (
        accountType === "installment" &&
        investment.installmentAdminFee !== null
      ) {
        // Installment accounts have specific admin fee structure
        adminFee = parseFloat(investment.installmentAdminFee);
      } else if (
        accountType === "floating_rate" &&
        investment.floatingRateAdminFee !== null
      ) {
        // Floating rate accounts store admin fee directly
        adminFee = parseFloat(investment.floatingRateAdminFee);
      } else if (investment.adminFeeApplied && accountType === "fixed_rate") {
        // Fixed rate accounts use standard 5% admin fee
        adminFee = grossAmount * ADMIN_FEE_PERCENTAGE;
      }

      // Net capital is what actually goes to work for the investor
      const netCapital = grossAmount - adminFee;

      // Add to totals
      totalNewInvestments += grossAmount;
      totalAdminFeesCollected += adminFee;
      totalNetInflowFunds += netCapital;

      return {
        id: investment.id,
        accountNumber: investment.accountNumber,
        accountType,
        investorEmail: investment.investorEmail,
        investorName: investment.investorName,
        grossCapital: grossAmount,
        adminFee,
        netCapital,
        rate,
        rateType,
        transactionDate: investment.transactionDate,
        endDate: investment.endDate,
      };
    });

    return {
      success: true,
      message: `Successfully retrieved inflow data for ${format(
        monthStart,
        "MMMM yyyy"
      )}`,
      data: {
        month: monthStart,
        totalNewInvestments,
        totalAdminFeesCollected,
        totalNetInflowFunds,
        newAccountsCount: processedInvestments.length,
        newInvestments: processedInvestments,
      },
    };
  } catch (error) {
    console.error("Get inflow by month error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving monthly inflow data",
    };
  }
}
