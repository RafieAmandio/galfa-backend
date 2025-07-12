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
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";

interface MonthlyCoFResult {
  success: boolean;
  message: string;
  data?: {
    month: Date;
    totalGainFund: number; // Total accumulated gain (Present Value - Original Net Capital)
    totalNetCapitalWorking: number; // Total net capital that was working
    totalPresentValue: number; // Total present value of all accounts
    averageReturnPercentage: number; // Average return percentage to date
    activeAccountsCount: number;
    accounts: Array<{
      id: number;
      accountNumber: string;
      investorEmail: string | null;
      netCapital: number; // Original net capital after admin fees
      annualRate: number;
      presentValue: number; // Current value as of the target month
      totalGain: number; // Present Value - Net Capital
      returnPercentage: number; // (Present Value / Net Capital - 1) * 100
      transactionDate: Date;
      endDate: Date | null;
    }>;
  };
}

/**
 * Get sum of all Total Gain Fund (amount of money gained) for every fix rate account for a specific month
 * This calculates the Cost of Funds (CoF) - how much the platform paid in interest to investors
 *
 * Smart rollover handling:
 * - During rollover month: Count PARENT accounts (full gain history from original start)
 * - After rollover month: Count ROLLOVER accounts (continuing gain tracking)
 * This ensures continuous gain tracking without double-counting across rollover transitions.
 */
export async function getFixRateCoFByMonth(
  targetMonth: Date
): Promise<MonthlyCoFResult> {
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

    // Get all fixed rate accounts that were active during the specified month
    const allMonthlyAccounts = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        annualRate: fixRateAccounts.annual_rate,
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
        )
      )
      .orderBy(accounts.transaction_date);

    // For CoF calculation, we need smart filtering to avoid double counting:
    // 1. If parent account is still active in this month: count parent (exclude rollover)
    // 2. If parent account ended before this month: count rollover (exclude parent)

    const rolloverAccountsWithParents = allMonthlyAccounts
      .filter((account) => account.isRollover && account.parentAccountId)
      .map((account) => ({
        rolloverAccountId: account.id,
        parentAccountId: account.parentAccountId!,
        rolloverStartDate: account.transactionDate,
      }));

    const accountsToExclude = new Set<number>();

    rolloverAccountsWithParents.forEach(
      ({ rolloverAccountId, parentAccountId, rolloverStartDate }) => {
        const parentAccount = allMonthlyAccounts.find(
          (acc) => acc.id === parentAccountId
        );

        if (parentAccount) {
          // If parent account ended before or during this month, exclude parent and count rollover
          if (parentAccount.endDate && parentAccount.endDate < monthStart) {
            accountsToExclude.add(parentAccountId);
          }
          // If parent account is still active during this month, exclude rollover and count parent
          else {
            accountsToExclude.add(rolloverAccountId);
          }
        }
      }
    );

    const monthlyAccounts = allMonthlyAccounts.filter(
      (account) => !accountsToExclude.has(account.id)
    );

    let totalGainFund = 0;
    let totalNetCapitalWorking = 0;
    let totalPresentValue = 0;

    // Process accounts with NPV calculations
    const processedAccounts = await Promise.all(
      monthlyAccounts.map(async (account) => {
        const grossAmount = parseFloat(account.grossCapital);
        const annualRate = parseFloat(account.annualRate);

        // Calculate net capital (after admin fee)
        let adminFee = 0;
        if (account.isRollover) {
          adminFee = 0; // No admin fee for rollovers
        } else if (account.adminFeeApplied) {
          adminFee = grossAmount * ADMIN_FEE_PERCENTAGE;
        }
        const netCapital = grossAmount - adminFee;

        // Calculate present value as of the target month end
        let presentValue = netCapital; // Fallback value

        try {
          const npvResult = await calculateNetPresentValueWithRedemptions(
            account.id,
            grossAmount,
            annualRate,
            account.transactionDate,
            monthEnd, // Calculate value as of end of target month
            account.isRollover || false,
            account.adminFeeApplied || false // Don't default to true - use actual value
          );

          presentValue = npvResult.currentValue;
        } catch (error) {
          console.error(
            `Error calculating NPV for account ${account.id}:`,
            error
          );
          // Fallback to simple compound calculation if NPV fails
          console.warn(
            `NPV calculation failed for account ${account.id}, using fallback calculation`
          );
          const monthsElapsed =
            (monthEnd.getTime() - account.transactionDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30.44); // Approximate months
          const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
          presentValue = netCapital * Math.pow(1 + monthlyRate, monthsElapsed);
        }

        // Calculate total gain (Present Value - Original Net Capital)
        // For rollover accounts, we only count gain earned since rollover date
        let totalGain: number;
        let returnPercentage: number;

        if (account.isRollover) {
          // For rollover accounts, gain is only the interest earned since rollover start
          totalGain = presentValue - netCapital;
          returnPercentage =
            netCapital > 0 ? (presentValue / netCapital - 1) * 100 : 0;

          // Note: Negative gains in rollover accounts are handled but not logged
        } else {
          // For original accounts, gain is total accumulated interest
          totalGain = presentValue - netCapital;
          returnPercentage =
            netCapital > 0 ? (presentValue / netCapital - 1) * 100 : 0;
        }

        // Add to totals
        totalGainFund += totalGain;
        totalNetCapitalWorking += netCapital;
        totalPresentValue += presentValue;

        return {
          id: account.id,
          accountNumber: account.accountNumber,
          investorEmail: account.investorEmail,
          netCapital,
          annualRate,
          presentValue,
          totalGain,
          returnPercentage,
          transactionDate: account.transactionDate,
          endDate: account.endDate,
        };
      })
    );

    // Calculate average return percentage
    const averageReturnPercentage =
      totalNetCapitalWorking > 0
        ? (totalPresentValue / totalNetCapitalWorking - 1) * 100
        : 0;

    return {
      success: true,
      message: `Successfully retrieved CoF data for ${format(
        monthStart,
        "MMMM yyyy"
      )}`,
      data: {
        month: monthStart,
        totalGainFund,
        totalNetCapitalWorking,
        totalPresentValue,
        averageReturnPercentage,
        activeAccountsCount: processedAccounts.length,
        accounts: processedAccounts,
      },
    };
  } catch (error) {
    console.error("Get fix rate CoF by month error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving monthly CoF data",
    };
  }
}
