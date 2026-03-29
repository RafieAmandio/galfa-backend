"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, gte, lte, lt, or, isNull, isNotNull } from "drizzle-orm";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";

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
 * Update expired accounts to 'expired' status
 * This ensures accounts past their end date are properly marked as expired
 */
async function updateExpiredAccounts(db: any): Promise<void> {
  try {
    const currentDate = new Date();

    const result = await db
      .update(accounts)
      .set({
        status: "mature",
        updated_at: currentDate,
      })
      .where(
        and(
          eq(accounts.status, "active"),
          isNotNull(accounts.end_date),
          lt(accounts.end_date, currentDate)
        )
      )
      .returning({ id: accounts.id });

    if (result.length > 0) {
      console.log(
        `Updated ${result.length} expired accounts to 'expired' status`
      );
    }
  } catch (error) {
    console.error("Error updating expired accounts:", error);
    // Don't throw error to prevent CoF calculation from failing
  }
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
  const db = createDrizzleConnection();

  try {
    // First, update any expired accounts to 'expired' status
    await updateExpiredAccounts(db);

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
        adminFeeRate: fixRateAccounts.admin_fee,
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
          or(isNull(accounts.end_date), gte(accounts.end_date, monthStart))
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

    // Batch-fetch all redemptions in a single query
    const accountIds = monthlyAccounts.map((a) => a.id);
    const redemptionMap = await getBatchRedemptions(accountIds);

    // Process accounts with NPV calculations using pre-fetched redemptions
    const processedAccounts = await Promise.all(
      monthlyAccounts.map(async (account) => {
        const grossAmount = parseFloat(account.grossCapital);
        const annualRate = parseFloat(account.annualRate);
        const adminFeeRate = Number(account.adminFeeRate || 0);

        // Calculate net capital (after admin fee) using stored rate
        const adminFee = grossAmount * adminFeeRate;
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
            account.adminFeeApplied || false, // Don't default to true - use actual value
            redemptionMap.get(account.id),
            adminFeeRate
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
          const monthlyRate = annualRate / 12;
          presentValue = netCapital * Math.pow(1 + monthlyRate, monthsElapsed);
        }

        // Extract just this month's interest from the monthly breakdown
        // The CoF for the allocated profit calculation needs the MONTHLY gain, not cumulative
        let monthlyGain = 0;
        try {
          const npvForMonth = await calculateNetPresentValueWithRedemptions(
            account.id,
            grossAmount,
            annualRate,
            account.transactionDate,
            monthEnd,
            account.isRollover || false,
            account.adminFeeApplied || false,
            redemptionMap.get(account.id),
            adminFeeRate
          );
          // Find the target month's entry in the breakdown
          const targetMonthKey = `${monthEnd.toLocaleString("en-US", { month: "long" })} ${monthEnd.getFullYear()}`;
          const monthEntry = npvForMonth.monthlyBreakdown.find(
            (m) => m.monthYear === targetMonthKey
          );
          if (monthEntry) {
            monthlyGain = monthEntry.interestEarned;
          }
        } catch {
          // Fallback: simple monthly interest
          monthlyGain = netCapital * (annualRate / 12);
        }

        // Calculate total gain for display purposes
        const totalGain = presentValue - netCapital;
        const returnPercentage =
          netCapital > 0 ? (presentValue / netCapital - 1) * 100 : 0;

        // Add monthly gain to CoF total (not cumulative gain)
        totalGainFund += monthlyGain;
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
