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
import { getBatchFloatingRateGrowthPercentages } from "../get-floating-rate-growth-percentage/index";
import { startOfMonth, addMonths, isAfter, format } from "date-fns";
import {
  getCurrentFloatingRateValue,
  getTotalGainedFund,
  FloatingRateCalculationInput,
} from "@/lib/utils/floating-rate-calculator";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { cache } from "react";

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
export const getFloatingRateInvestments = cache(
  async function (): Promise<FloatingRateInvestmentsResult> {
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

      const currentMonth = startOfMonth(new Date());

      // Batch-fetch all growth rates and redemptions in parallel
      const accountIds = investmentData.map((i) => i.id);
      const [growthRatesMap, redemptionMap] = await Promise.all([
        getBatchFloatingRateGrowthPercentages(earliestDate, new Date()),
        getBatchRedemptions(accountIds),
      ]);

      // Get current month growth data for display
      const currentMonthKey = format(currentMonth, "yyyy-MM");
      const currentMonthGrowth = growthRatesMap.get(currentMonthKey);
      const growthData = {
        growthPercentage: currentMonthGrowth?.growthPercentage || 0,
        performancePercentage: currentMonthGrowth?.performancePercentage || 0,
        appliedRule: currentMonthGrowth?.appliedRule || "No data available",
      };

      // Build monthlyGrowthRates array from batch map (used as fallback)
      const monthlyGrowthRates: Array<{
        month: Date;
        growthPercentage: number;
        performancePercentage: number;
        hasData: boolean;
      }> = [];
      let monthToCheck = startOfMonth(earliestDate);
      while (!isAfter(monthToCheck, currentMonth)) {
        const key = format(monthToCheck, "yyyy-MM");
        const data = growthRatesMap.get(key);
        monthlyGrowthRates.push({
          month: monthToCheck,
          growthPercentage: data?.growthPercentage || 0,
          performancePercentage: data?.performancePercentage || 0,
          hasData: data?.hasData || false,
        });
        monthToCheck = addMonths(monthToCheck, 1);
      }

      let totalPresentValueFund = 0;
      let totalGainedFund = 0;

      // Calculate compound growth for each investment using redemption-aware calculations
      const investments: FloatingRateInvestment[] = await Promise.all(
        investmentData.map(async (investment) => {
          // Calculate current value using redemption-aware calculation
          let presentValueFund: number;
          let investmentGainedFund: number;

          try {
            // Use redemption-aware calculation with pre-fetched data
            const valueWithRedemptions =
              await calculateFloatingRateValueWithRedemptions(
                investment.id,
                investment.netInvestorFund,
                investment.transactionDate,
                new Date(),
                redemptionMap.get(investment.id),
                growthRatesMap,
                investment.endDate
              );

            presentValueFund = valueWithRedemptions.currentValue;
            investmentGainedFund =
              presentValueFund -
              investment.netInvestorFund +
              valueWithRedemptions.totalRedemptions;
          } catch (error) {
            console.error(
              `Error calculating redemption-aware value for account ${investment.id}:`,
              error
            );

            // Fallback to original calculation if redemption calculation fails
            const calculationInput: FloatingRateCalculationInput = {
              netInvestorFund: investment.netInvestorFund,
              transactionDate: investment.transactionDate,
              endDate: investment.endDate,
              monthlyGrowthRates,
            };

            presentValueFund = getCurrentFloatingRateValue(calculationInput);
            investmentGainedFund = getTotalGainedFund(calculationInput);
          }

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
        })
      );

      // Calculate totals from the processed investments
      totalPresentValueFund = investments.reduce(
        (sum, inv) => sum + inv.presentValueFund,
        0
      );
      totalGainedFund = investments.reduce(
        (sum, inv) => sum + inv.totalGainedFund,
        0
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
);
