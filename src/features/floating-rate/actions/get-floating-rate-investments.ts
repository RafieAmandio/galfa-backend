"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getFloatingRateGrowthPercentage } from "./get-floating-rate-growth-percentage";
import { startOfMonth, addMonths, isAfter } from "date-fns";
import {
  getCurrentFloatingRateValue,
  getTotalGainedFund,
  FloatingRateCalculationInput,
} from "@/lib/utils/floating-rate-calculator";

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  presentValueFund: number;
  totalGainedFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  growthRate: number;
  performanceRate: number;
  appliedRule: string;
}

interface FloatingRateInvestmentsResult {
  success: boolean;
  message: string;
  data?: {
    investments: FloatingRateInvestment[];
    totalGrossCapital: number;
    totalNetInvestorFund: number;
    totalAdminFees: number;
    totalPresentValueFund: number;
    totalGainedFund: number;
    activeAccountsCount: number;
  };
}

/**
 * Get all floating rate investments for admin view using compound growth calculation
 */
export async function getFloatingRateInvestments(): Promise<FloatingRateInvestmentsResult> {
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
    // Get all floating rate accounts with related information
    const results = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        investorEmail: authUsers.email,
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
      .orderBy(accounts.transaction_date);

    if (results.length === 0) {
      return {
        success: true,
        message: "No floating rate investments found",
        data: {
          investments: [],
          totalGrossCapital: 0,
          totalNetInvestorFund: 0,
          totalAdminFees: 0,
          totalPresentValueFund: 0,
          totalGainedFund: 0,
          activeAccountsCount: 0,
        },
      };
    }

    // Get current growth rate data for current month
    const currentMonth = startOfMonth(new Date());
    const growthRateResult = await getFloatingRateGrowthPercentage(
      currentMonth
    );
    const defaultGrowthData = {
      growthPercentage: 0,
      performancePercentage: 0,
      appliedRule: "No data available",
    };

    const growthData = growthRateResult.success
      ? {
          growthPercentage: growthRateResult.data!.growthPercentage,
          performancePercentage: growthRateResult.data!.performancePercentage,
          appliedRule: growthRateResult.data!.calculation.rule,
        }
      : defaultGrowthData;

    let totalGrossCapital = 0;
    let totalNetInvestorFund = 0;
    let totalAdminFees = 0;

    // Process basic investment data and calculate totals
    const investmentData = results.map((result) => {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFeeAmount = parseFloat(result.adminFee);
      const netInvestorFund = grossCapital - adminFeeAmount;

      totalGrossCapital += grossCapital;
      totalNetInvestorFund += netInvestorFund;
      totalAdminFees += adminFeeAmount;

      return {
        ...result,
        grossCapital,
        adminFeeAmount,
        netInvestorFund,
      };
    });

    // Find the earliest investment date to determine month range
    const earliestDate = investmentData.reduce((earliest, investment) => {
      return investment.transactionDate < earliest
        ? investment.transactionDate
        : earliest;
    }, investmentData[0].transactionDate);

    // Generate all months from earliest investment to current month
    const monthlyGrowthRates: Array<{
      month: Date;
      growthPercentage: number;
      performancePercentage: number;
      hasData: boolean;
    }> = [];

    let monthToCheck = startOfMonth(earliestDate);
    while (!isAfter(monthToCheck, currentMonth)) {
      try {
        const growthResult = await getFloatingRateGrowthPercentage(
          monthToCheck
        );

        monthlyGrowthRates.push({
          month: monthToCheck,
          growthPercentage: growthResult.data?.growthPercentage || 0,
          performancePercentage: growthResult.data?.performancePercentage || 0,
          hasData: growthResult.success,
        });
      } catch (error) {
        console.error(`Error getting growth rate for ${monthToCheck}:`, error);
        monthlyGrowthRates.push({
          month: monthToCheck,
          growthPercentage: 0,
          performancePercentage: 0,
          hasData: false,
        });
      }

      monthToCheck = addMonths(monthToCheck, 1);
    }

    let totalPresentValueFund = 0;
    let totalGainedFund = 0;

    // Calculate compound growth for each investment
    const investments: FloatingRateInvestment[] = investmentData.map(
      (investment) => {
        // Prepare input for compound calculation
        const calculationInput: FloatingRateCalculationInput = {
          netInvestorFund: investment.netInvestorFund,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          monthlyGrowthRates,
        };

        // Calculate current value and gained fund using compound growth
        const presentValueFund = getCurrentFloatingRateValue(calculationInput);
        const investmentGainedFund = getTotalGainedFund(calculationInput);

        totalPresentValueFund += presentValueFund;
        totalGainedFund += investmentGainedFund;

        return {
          id: investment.id,
          accountNumber: investment.accountNumber,
          investorEmail: investment.investorEmail || "N/A",
          grossCapital: investment.grossCapital,
          adminFee: investment.adminFeeAmount,
          netInvestorFund: investment.netInvestorFund,
          presentValueFund,
          totalGainedFund: investmentGainedFund,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          status: investment.status,
          isRollover: investment.isRollover || false,
          rolloverSequence: investment.rolloverSequence || 0,
          createdAt: investment.createdAt,
          growthRate: growthData.growthPercentage,
          performanceRate: growthData.performancePercentage,
          appliedRule: growthData.appliedRule,
        };
      }
    );

    return {
      success: true,
      message: `Successfully retrieved ${investments.length} floating rate investments with compound growth calculations`,
      data: {
        investments,
        totalGrossCapital,
        totalNetInvestorFund,
        totalAdminFees,
        totalPresentValueFund,
        totalGainedFund,
        activeAccountsCount: investments.filter(
          (inv) => inv.status === "active"
        ).length,
      },
    };
  } catch (error) {
    console.error("Get floating rate investments error:", error);
    return {
      success: false,
      message: "An error occurred while retrieving floating rate investments",
    };
  }
}
