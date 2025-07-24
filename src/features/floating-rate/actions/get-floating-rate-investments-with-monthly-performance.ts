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
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  isAfter,
  isBefore,
  format,
  getDaysInMonth,
  differenceInDays,
  min,
  max,
} from "date-fns";
import {
  calculateFloatingRateMonthlyValues,
  FloatingRateCalculationInput,
  MonthlyValueResult,
} from "@/lib/utils/floating-rate-calculator";

interface MonthlyPerformance {
  month: Date;
  monthLabel: string;
  performanceRate: number;
  growthRate: number;
  previousMonthValue: number;
  presentValueFund: number;
  gainedFund: number;
  isFirstMonth: boolean;
  daysActive: number;
  totalDaysInMonth: number;
  appliedRule: string;
  hasData: boolean;
}

interface FloatingRateInvestmentWithMonthly {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  monthlyPerformance: MonthlyPerformance[];
  totalMonthsActive: number;
  presentValueFund: number;
  totalGainedFund: number;
}

interface FloatingRateInvestmentsWithMonthlyResult {
  success: boolean;
  message: string;
  data?: {
    investments: FloatingRateInvestmentWithMonthly[];
    totalGrossCapital: number;
    totalNetInvestorFund: number;
    totalAdminFees: number;
    totalPresentValueFund: number;
    totalGainedFund: number;
    activeAccountsCount: number;
    availableMonths: string[];
  };
}

/**
 * Get all floating rate investments with monthly performance data using compound growth calculation
 */
export async function getFloatingRateInvestmentsWithMonthlyPerformance(): Promise<FloatingRateInvestmentsWithMonthlyResult> {
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

    let totalGrossCapital = 0;
    let totalNetInvestorFund = 0;
    let totalAdminFees = 0;
    const availableMonthsSet = new Set<string>();

    // First, collect all investments with their basic data
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

    // Get all months from earliest investment to current
    const earliestDate = results.reduce((earliest, result) => {
      return result.transactionDate < earliest
        ? result.transactionDate
        : earliest;
    }, results[0]?.transactionDate || new Date());

    const currentMonth = startOfMonth(new Date());
    let monthToCheck = startOfMonth(earliestDate);

    while (!isAfter(monthToCheck, currentMonth)) {
      const monthLabel = format(monthToCheck, "MMM yyyy");
      availableMonthsSet.add(monthLabel);
      monthToCheck = addMonths(monthToCheck, 1);
    }

    // Sort months chronologically
    const sortedAvailableMonths = Array.from(availableMonthsSet).sort(
      (a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      }
    );

    // Get growth rates for all months
    const monthlyGrowthRates: Array<{
      month: Date;
      monthLabel: string;
      growthPercentage: number;
      performancePercentage: number;
      appliedRule: string;
      hasData: boolean;
    }> = [];

    for (const monthLabel of sortedAvailableMonths) {
      const monthDate = new Date(monthLabel);
      const monthStart = startOfMonth(monthDate);

      try {
        const growthResult = await getFloatingRateGrowthPercentage(monthStart);

        if (growthResult.success && growthResult.data) {
          monthlyGrowthRates.push({
            month: monthStart,
            monthLabel,
            growthPercentage: growthResult.data.growthPercentage,
            performancePercentage: growthResult.data.performancePercentage,
            appliedRule: growthResult.data.calculation.rule,
            hasData: true,
          });
        } else {
          monthlyGrowthRates.push({
            month: monthStart,
            monthLabel,
            growthPercentage: 0,
            performancePercentage: 0,
            appliedRule: "No data",
            hasData: false,
          });
        }
      } catch (error) {
        console.error(`Error getting performance for ${monthLabel}:`, error);
        monthlyGrowthRates.push({
          month: monthStart,
          monthLabel,
          growthPercentage: 0,
          performancePercentage: 0,
          appliedRule: "Error",
          hasData: false,
        });
      }
    }

    let totalPresentValueFund = 0;
    let totalGainedFund = 0;

    // Calculate monthly performance for each investment using the new compound growth logic
    const investments: FloatingRateInvestmentWithMonthly[] = investmentData.map(
      (investment) => {
        // Prepare input for the compound calculation
        const calculationInput: FloatingRateCalculationInput = {
          netInvestorFund: investment.netInvestorFund,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          monthlyGrowthRates: monthlyGrowthRates.map((rate) => ({
            month: rate.month,
            growthPercentage: rate.growthPercentage,
            performancePercentage: rate.performancePercentage,
            hasData: rate.hasData,
          })),
        };

        // Calculate monthly values using the new compound growth function
        const monthlyValues =
          calculateFloatingRateMonthlyValues(calculationInput);

        // Convert to the expected MonthlyPerformance format
        const monthlyPerformance: MonthlyPerformance[] = monthlyValues.map(
          (monthValue) => {
            // Find the corresponding growth rate data for additional info
            const growthRateData = monthlyGrowthRates.find(
              (rate) => rate.month.getTime() === monthValue.month.getTime()
            );

            return {
              month: monthValue.month,
              monthLabel: monthValue.monthLabel,
              performanceRate: monthValue.performanceRate,
              growthRate: monthValue.growthRate,
              previousMonthValue: monthValue.previousMonthValue,
              presentValueFund: monthValue.presentValueFund,
              gainedFund: monthValue.gainedFund,
              isFirstMonth: monthValue.isFirstMonth,
              daysActive: monthValue.daysActive,
              totalDaysInMonth: monthValue.totalDaysInMonth,
              appliedRule: growthRateData?.appliedRule || "Unknown",
              hasData: monthValue.hasData,
            };
          }
        );

        // Calculate current value and total gained fund
        const presentValueFund =
          monthlyValues.length > 0
            ? monthlyValues[monthlyValues.length - 1].presentValueFund
            : investment.netInvestorFund;

        const investmentGainedFund =
          presentValueFund - investment.netInvestorFund;

        totalPresentValueFund += presentValueFund;
        totalGainedFund += investmentGainedFund;

        return {
          id: investment.id,
          accountNumber: investment.accountNumber,
          investorEmail: investment.investorEmail || "N/A",
          grossCapital: investment.grossCapital,
          adminFee: investment.adminFeeAmount,
          netInvestorFund: investment.netInvestorFund,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          status: investment.status,
          isRollover: investment.isRollover || false,
          rolloverSequence: investment.rolloverSequence || 0,
          createdAt: investment.createdAt,
          monthlyPerformance,
          totalMonthsActive: monthlyPerformance.length,
          presentValueFund,
          totalGainedFund: investmentGainedFund,
        };
      }
    );

    return {
      success: true,
      message: `Successfully retrieved ${investments.length} floating rate investments with compound monthly performance data`,
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
        availableMonths: sortedAvailableMonths,
      },
    };
  } catch (error) {
    console.error(
      "Get floating rate investments with monthly performance error:",
      error
    );
    return {
      success: false,
      message:
        "An error occurred while retrieving floating rate investments with monthly performance",
    };
  }
}
