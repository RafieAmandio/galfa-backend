"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getFloatingRateGrowthPercentagePublic } from "./get-floating-rate-growth-percentage";
import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInDays,
  min,
  max,
  isAfter,
  isBefore,
} from "date-fns";

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  gainedFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  growthPercentage: number;
  performancePercentage: number;
  appliedRule: string;
}

interface InvestorFloatingRateInvestmentsResult {
  success: boolean;
  message: string;
  data?: {
    investments: FloatingRateInvestment[];
    totalGrossCapital: number;
    totalNetCapital: number;
    totalAdminFees: number;
    totalGainedFund: number;
    activeAccountsCount: number;
    currentMonthPerformance: {
      growthPercentage: number;
      performancePercentage: number;
      appliedRule: string;
      hasPerformanceData: boolean;
      message: string;
    };
  };
}

/**
 * Get floating rate investments for a specific investor
 */
export async function getInvestorFloatingRateInvestments(
  investorEmail: string
): Promise<InvestorFloatingRateInvestmentsResult> {
  if (!investorEmail) {
    return {
      success: false,
      message: "Investor email is required",
    };
  }

  const db = createDrizzleConnection();

  try {
    // Get floating rate accounts for the specific investor
    const results = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        isRollover: accounts.is_rollover,
        rolloverSequence: accounts.rollover_sequence,
        createdAt: accounts.created_at,
        // Floating rate specific fields
        adminFee: floatingRateAccounts.admin_fee,
      })
      .from(accounts)
      .innerJoin(
        floatingRateAccounts,
        eq(accounts.id, floatingRateAccounts.account_id)
      )
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.email, investorEmail))
      .orderBy(accounts.transaction_date);

    // Get current growth rate data for current month
    const currentMonth = startOfMonth(new Date());
    const growthRateResult = await getFloatingRateGrowthPercentagePublic(
      currentMonth
    );

    const growthData = {
      growthPercentage: growthRateResult.data?.growthPercentage || 0,
      performancePercentage: growthRateResult.data?.performancePercentage || 0,
      appliedRule:
        growthRateResult.data?.calculation.rule || "No data available",
      hasData: growthRateResult.success,
      message: growthRateResult.message,
    };

    let totalGrossCapital = 0;
    let totalNetCapital = 0;
    let totalAdminFees = 0;

    // First pass: collect basic investment data and calculate totals
    const investmentData = results.map((result) => {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFeeAmount = parseFloat(result.adminFee);
      const netCapital = grossCapital - adminFeeAmount;

      totalGrossCapital += grossCapital;
      totalNetCapital += netCapital;
      totalAdminFees += adminFeeAmount;

      return {
        ...result,
        grossCapital,
        adminFeeAmount,
        netCapital,
      };
    });

    // Calculate total active principle for current month (all investor's investments)
    let totalActivePrincipleForCurrentMonth = 0;
    const currentMonthStart = startOfMonth(currentMonth);

    for (const investment of investmentData) {
      const investmentStart = startOfMonth(investment.transactionDate);
      const investmentEnd = investment.endDate
        ? startOfMonth(investment.endDate)
        : null; // No end date means still active

      // Check if investment is active in current month
      const isActiveInCurrentMonth =
        !isAfter(investmentStart, currentMonthStart) &&
        (investmentEnd === null || !isBefore(investmentEnd, currentMonthStart));

      if (isActiveInCurrentMonth) {
        totalActivePrincipleForCurrentMonth += investment.netCapital;
      }
    }

    // Calculate total gained fund for the month (applying growth to total active principle)
    const totalGainedFundForMonth =
      growthData.growthPercentage > 0
        ? totalActivePrincipleForCurrentMonth *
          (1 + growthData.growthPercentage / 100)
        : totalActivePrincipleForCurrentMonth;

    let totalGainedFund = 0;

    // Second pass: calculate individual gained funds based on proportional share
    const investments: FloatingRateInvestment[] = investmentData.map(
      (investment) => {
        const investmentStart = startOfMonth(investment.transactionDate);
        const investmentEnd = investment.endDate
          ? startOfMonth(investment.endDate)
          : null;

        // Check if investment is active in current month
        const isActiveInCurrentMonth =
          !isAfter(investmentStart, currentMonthStart) &&
          (investmentEnd === null ||
            !isBefore(investmentEnd, currentMonthStart));

        let gainedFund = 0;

        if (isActiveInCurrentMonth && totalActivePrincipleForCurrentMonth > 0) {
          // Calculate this investment's share of the total gained fund
          const investmentShare =
            investment.netCapital / totalActivePrincipleForCurrentMonth;
          gainedFund = totalGainedFundForMonth * investmentShare;
        }

        totalGainedFund += gainedFund;

        return {
          id: investment.id,
          accountNumber: investment.accountNumber,
          grossCapital: investment.grossCapital,
          adminFee: investment.adminFeeAmount,
          netCapital: investment.netCapital,
          gainedFund,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          status: investment.status,
          isRollover: investment.isRollover || false,
          rolloverSequence: investment.rolloverSequence || 0,
          createdAt: investment.createdAt,
          growthPercentage: growthData.growthPercentage,
          performancePercentage: growthData.performancePercentage,
          appliedRule: growthData.appliedRule,
        };
      }
    );

    return {
      success: true,
      message: `Successfully retrieved ${investments.length} floating rate investments`,
      data: {
        investments,
        totalGrossCapital,
        totalNetCapital,
        totalAdminFees,
        totalGainedFund,
        activeAccountsCount: investments.filter(
          (inv) => inv.status === "active"
        ).length,
        currentMonthPerformance: {
          growthPercentage: growthData.growthPercentage,
          performancePercentage: growthData.performancePercentage,
          appliedRule: growthData.appliedRule,
          hasPerformanceData: growthData.hasData,
          message: growthData.message,
        },
      },
    };
  } catch (error) {
    console.error("Get investor floating rate investments error:", error);
    return {
      success: false,
      message:
        "An error occurred while retrieving your floating rate investments",
    };
  }
}
