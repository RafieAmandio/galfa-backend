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
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { cache } from "react";

interface MonthlyRedemption {
  amount: number;
  transactionDate: Date;
  description: string | null;
  status: string;
}

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
  redemptions: MonthlyRedemption[];
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
export const getFloatingRateInvestmentsWithMonthlyPerformanceOfCurrentUser =
  cache(async function (): Promise<FloatingRateInvestmentsWithMonthlyResult> {
    // Get current User
    const user = await getCurrentUser();
    if (!user?.user) {
      return {
        success: false,
        message: "Unauthorized: User not found",
      };
    }

    const db = createDrizzleConnection();

    // Get user's id
    const userId = user.user.id;

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
        .where(eq(accounts.user_id, userId))
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

      // Batch-fetch all growth rates and redemptions in parallel
      const accountIds = investmentData.map((i) => i.id);
      const [growthRatesMap, redemptionMap] = await Promise.all([
        getBatchFloatingRateGrowthPercentages(earliestDate, new Date()),
        getBatchRedemptions(accountIds),
      ]);

      // Build monthlyGrowthRates array from batch map
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
        const key = format(monthStart, "yyyy-MM");
        const data = growthRatesMap.get(key);

        monthlyGrowthRates.push({
          month: monthStart,
          monthLabel,
          growthPercentage: data?.growthPercentage || 0,
          performancePercentage: data?.performancePercentage || 0,
          appliedRule: data?.appliedRule || "No data",
          hasData: data?.hasData || false,
        });
      }

      let totalPresentValueFund = 0;
      let totalGainedFund = 0;

      // Calculate monthly performance for each investment using the new compound growth logic
      const investments: FloatingRateInvestmentWithMonthly[] =
        await Promise.all(
          investmentData.map(async (investment) => {
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

            // Use redemption-aware calculation for accurate monthly performance including redemptions
            let monthlyPerformance: MonthlyPerformance[] = [];
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
                  growthRatesMap
                );

              presentValueFund = valueWithRedemptions.currentValue;
              investmentGainedFund =
                presentValueFund -
                investment.netInvestorFund +
                valueWithRedemptions.totalRedemptions;

              // Convert monthly breakdown to MonthlyPerformance format with redemptions
              monthlyPerformance = valueWithRedemptions.monthlyBreakdown.map(
                (monthBreakdown) => {
                  // Find the corresponding growth rate data for additional info
                  const monthDate = new Date(monthBreakdown.monthYear + " 1");
                  const growthRateData = monthlyGrowthRates.find(
                    (rate) =>
                      rate.month.getMonth() === monthDate.getMonth() &&
                      rate.month.getFullYear() === monthDate.getFullYear()
                  );

                  // Check if this is the first month of investment
                  const transactionMonth = new Date(
                    investment.transactionDate.getFullYear(),
                    investment.transactionDate.getMonth()
                  );
                  const currentMonth = new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth()
                  );
                  const isFirstMonth =
                    transactionMonth.getTime() === currentMonth.getTime();

                  return {
                    month: monthDate,
                    monthLabel: monthBreakdown.monthYear,
                    performanceRate: monthBreakdown.performanceRate,
                    growthRate: monthBreakdown.growthRate,
                    previousMonthValue: monthBreakdown.startingBalance,
                    presentValueFund: monthBreakdown.endingBalance,
                    gainedFund: monthBreakdown.gainedFund,
                    isFirstMonth,
                    daysActive: monthBreakdown.daysInPeriod,
                    totalDaysInMonth: monthBreakdown.daysInPeriod, // We can improve this if needed
                    appliedRule: monthBreakdown.appliedRule,
                    hasData: monthBreakdown.hasData,
                    redemptions: monthBreakdown.redemptionDetails.map(
                      (redemption) => ({
                        amount: redemption.amount,
                        transactionDate: redemption.transactionDate,
                        description:
                          redemption.status === "completed"
                            ? `Redemption of ${new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(redemption.amount)}`
                            : `Pending redemption`,
                        status: redemption.status,
                      })
                    ),
                  };
                }
              );
            } catch (error) {
              console.error(
                `Error calculating redemption-aware value for account ${investment.id}:`,
                error
              );

              // Fallback to original calculation if redemption calculation fails
              const monthlyValues =
                calculateFloatingRateMonthlyValues(calculationInput);

              monthlyPerformance = monthlyValues.map((monthValue) => {
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
                  redemptions: [], // No redemptions in fallback
                };
              });

              presentValueFund =
                monthlyValues.length > 0
                  ? monthlyValues[monthlyValues.length - 1].presentValueFund
                  : investment.netInvestorFund;

              investmentGainedFund =
                presentValueFund - investment.netInvestorFund;
            }

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
  });
