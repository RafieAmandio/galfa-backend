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
import {
  startOfMonth,
  endOfMonth,
  differenceInMonths,
  addMonths,
} from "date-fns";

interface MonthlyInstallmentCoFResult {
  success: boolean;
  message: string;
  data?: {
    month: Date;
    totalGainedFunds: number; // Total interest earned by admin from all installment accounts
    totalNetCapitalWorking: number; // Total net capital that was working
    averageReturnPercentage: number; // Average return percentage to date
    activeAccountsCount: number;
    accounts: Array<{
      id: number;
      accountNumber: string;
      investorEmail: string | null;
      netCapital: number; // Original net capital after admin fees
      monthlyCof: number;
      investmentType: "principle" | "interest_only";
      presentValue: number; // Current value as of the target month
      totalGainedFunds: number; // Interest earned by admin from this account
      returnPercentage: number; // (Present Value / Net Capital - 1) * 100
      transactionDate: Date;
      endDate: Date | null;
    }>;
  };
}

/**
 * Calculate installment present value and gained funds for a specific month
 * For installment accounts, gained funds = interest payment earned during the target month only
 * Interest gains start in the month AFTER the transaction date
 */
function calculateInstallmentValue(
  netCapital: number,
  monthlyCof: number,
  investmentType: "principle" | "interest_only",
  startDate: Date,
  endDate: Date | null,
  targetMonth: Date
) {
  const targetMonthStart = startOfMonth(targetMonth);
  const targetMonthEnd = endOfMonth(targetMonth);
  const accountStartDate = startOfMonth(startDate);

  // Interest starts in the month AFTER the transaction date
  const interestStartDate = addMonths(accountStartDate, 1);

  // If target month is before interest starts, no gains for this month
  if (targetMonthStart < interestStartDate) {
    return {
      presentValue: 0,
      monthlyGainedFunds: 0,
    };
  }

  // Check if account ended before target month
  if (endDate && endOfMonth(endDate) < targetMonthStart) {
    return {
      presentValue: 0,
      monthlyGainedFunds: 0,
    };
  }

  // Calculate which month number this is in the investment lifecycle (1-based)
  // Since interest starts month after transaction, month 1 is the first interest-bearing month
  const monthNumber = Math.max(
    1,
    differenceInMonths(targetMonthStart, interestStartDate) + 1
  );

  const totalDurationMonths = endDate
    ? differenceInMonths(endOfMonth(endDate), accountStartDate)
    : 12; // Default to 12 if no end date

  // If we're beyond the investment duration, no payment this month
  if (monthNumber > totalDurationMonths) {
    return {
      presentValue: 0,
      monthlyGainedFunds: 0,
    };
  }

  if (investmentType === "principle") {
    // Principal type: Constant monthly payments (principal + interest)
    // Interest is constant each month based on original capital
    const monthlyInterest = netCapital * monthlyCof;
    const monthlyPrincipalPayment = netCapital / totalDurationMonths;

    // Monthly gained funds = just this month's interest payment
    const monthlyGainedFunds = monthlyInterest;

    // Present value = remaining capital after this month's principal payment
    const remainingCapital = Math.max(
      0,
      netCapital - monthlyPrincipalPayment * monthNumber
    );
    const presentValue = remainingCapital;

    return {
      presentValue,
      monthlyGainedFunds,
    };
  } else {
    // Interest-only type: Only interest payments until final month
    const monthlyInterest = netCapital * monthlyCof;

    // For interest-only, we receive interest payment this month
    const monthlyGainedFunds = monthlyInterest;

    // Present value = original capital (stays constant until final month)
    const presentValue = netCapital;

    return {
      presentValue,
      monthlyGainedFunds,
    };
  }
}

/**
 * Get sum of all Total Gained Funds (interest earned) for every installment account for a specific month
 * This calculates the Cost of Funds (CoF) - how much the platform earned in interest from installment accounts
 * CoF for a given month shows the gained interest for the FOLLOWING month
 * (e.g., CoF for April shows gained interest for May)
 */
export async function getInstallmentCoFByMonth(
  targetMonth: Date
): Promise<MonthlyInstallmentCoFResult> {
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

    // CoF for target month shows gained interest for the FOLLOWING month
    const cofCalculationMonth = addMonths(targetMonth, 1);
    const cofMonthStart = startOfMonth(cofCalculationMonth);
    const cofMonthEnd = endOfMonth(cofCalculationMonth);

    // Get all installment accounts that were active during the specified month
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
          // Account was created before or during the CoF calculation month
          lte(accounts.transaction_date, cofMonthEnd),
          // Account was active during the CoF calculation month (either no end date or ended after month start)
          accounts.end_date === null
            ? undefined
            : gte(accounts.end_date, cofMonthStart)
        )
      )
      .orderBy(accounts.transaction_date);

    let totalGainedFunds = 0;
    let totalNetCapitalWorking = 0;

    // Process accounts with installment calculations using the CoF calculation month
    const processedAccounts = monthlyAccounts.map((account) => {
      const grossAmount = parseFloat(account.grossCapital);
      const adminFeeRate = parseFloat(account.adminFee);
      const monthlyCof = parseFloat(account.monthlyCof);

      // Calculate net capital (after admin fee)
      const netCapital = grossAmount - grossAmount * adminFeeRate;

      // Calculate present value and gained funds for the CoF calculation month (following month)
      const calculation = calculateInstallmentValue(
        netCapital,
        monthlyCof,
        account.investmentType as "principle" | "interest_only",
        account.transactionDate,
        account.endDate,
        cofCalculationMonth // Use the following month for CoF calculation
      );

      // Calculate return percentage
      const returnPercentage =
        netCapital > 0 ? (calculation.presentValue / netCapital - 1) * 100 : 0;

      totalGainedFunds += calculation.monthlyGainedFunds;
      totalNetCapitalWorking += netCapital;

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        investorEmail: account.investorEmail,
        netCapital,
        monthlyCof,
        investmentType: account.investmentType as "principle" | "interest_only",
        presentValue: calculation.presentValue,
        totalGainedFunds: calculation.monthlyGainedFunds,
        returnPercentage,
        transactionDate: account.transactionDate,
        endDate: account.endDate,
      };
    });

    // Calculate average return percentage based on gained funds
    const averageReturnPercentage =
      totalNetCapitalWorking > 0
        ? (totalGainedFunds / totalNetCapitalWorking) * 100
        : 0;

    return {
      success: true,
      message: `Successfully retrieved installment CoF for ${monthStart.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      )} (showing gained interest for ${cofCalculationMonth.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      )})`,
      data: {
        month: monthStart, // Still return the original target month for reference
        totalGainedFunds,
        totalNetCapitalWorking,
        averageReturnPercentage,
        activeAccountsCount: processedAccounts.length,
        accounts: processedAccounts,
      },
    };
  } catch (error) {
    console.error("Get installment CoF by month error:", error);
    return {
      success: false,
      message:
        "An error occurred while retrieving monthly installment gained funds data",
    };
  }
}
