"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getFloatingRateGrowthPercentageInternal } from "./get-floating-rate-growth-percentage";
import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInDays,
  min,
  max,
  isAfter,
  isBefore,
  addMonths,
  format,
} from "date-fns";
import {
  calculateFloatingRateMonthlyValues,
  getCurrentFloatingRateValue,
  getTotalGainedFund,
  FloatingRateCalculationInput,
} from "@/lib/utils/floating-rate-calculator";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";

interface MonthlyRedemption {
  amount: number;
  transactionDate: Date;
  description: string | null;
  status: string;
}

interface CurrentMonthPerformance {
  growthRate: number;
  performanceRate: number;
  appliedRule: string;
  hasPerformanceData: boolean;
  message: string;
  redemptions: MonthlyRedemption[];
}

interface FloatingRateInvestment {
  id: number;
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  presentValueFund: number;
  gainedFund: number;
  totalRedemptions: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  currentMonthPerformance: CurrentMonthPerformance;
}

interface InvestorFloatingRateInvestmentsResult {
  success: boolean;
  message: string;
  data?: {
    investments: FloatingRateInvestment[];
    totalGrossCapital: number;
    totalNetInvestorFund: number;
    totalAdminFees: number;
    totalPresentValueFund: number;
    totalGainedFund: number;
    totalRedemptions: number;
    activeAccountsCount: number;
    currentMonthPerformance: {
      growthRate: number;
      performanceRate: number;
      appliedRule: string;
      hasPerformanceData: boolean;
      message: string;
      redemptions: MonthlyRedemption[];
    };
  };
}

/**
 * Get floating rate investments for a specific investor using compound growth calculation
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

    if (results.length === 0) {
      return {
        success: true,
        message: "No floating rate investments found for this investor",
        data: {
          investments: [],
          totalGrossCapital: 0,
          totalNetInvestorFund: 0,
          totalAdminFees: 0,
          totalPresentValueFund: 0,
          totalGainedFund: 0,
          totalRedemptions: 0,
          activeAccountsCount: 0,
          currentMonthPerformance: {
            growthRate: 0,
            performanceRate: 0,
            appliedRule: "No investments found",
            hasPerformanceData: false,
            message: "No floating rate investments found",
            redemptions: [],
          },
        },
      };
    }

    // Get current growth rate data for current month
    const currentMonth = startOfMonth(new Date());
    const growthRateResult = await getFloatingRateGrowthPercentageInternal(
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
        const growthResult = await getFloatingRateGrowthPercentageInternal(
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

    // Calculate compound growth for each investment using redemption-aware calculations
    const investments: FloatingRateInvestment[] = await Promise.all(
      investmentData.map(async (investment) => {
        // Calculate current value using redemption-aware calculation
        let presentValueFund: number;
        let gainedFund: number;
        let totalRedemptions = 0;
        let currentMonthRedemptions: MonthlyRedemption[] = [];

        try {
          // Use redemption-aware calculation for accurate current value
          const valueWithRedemptions =
            await calculateFloatingRateValueWithRedemptions(
              investment.id,
              investment.netInvestorFund,
              investment.transactionDate,
              new Date()
            );

          presentValueFund = valueWithRedemptions.currentValue;
          totalRedemptions = valueWithRedemptions.totalRedemptions;
          gainedFund =
            presentValueFund - investment.netInvestorFund + totalRedemptions;

          // Get current month redemptions
          const currentMonthKey = format(currentMonth, "MMM yyyy");
          const currentMonthBreakdown =
            valueWithRedemptions.monthlyBreakdown.find(
              (month) => month.monthYear === currentMonthKey
            );

          if (currentMonthBreakdown) {
            currentMonthRedemptions =
              currentMonthBreakdown.redemptionDetails.map((redemption) => ({
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
              }));
          }
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
          gainedFund = getTotalGainedFund(calculationInput);
        }

        return {
          id: investment.id,
          accountNumber: investment.accountNumber,
          grossCapital: investment.grossCapital,
          adminFee: investment.adminFeeAmount,
          netInvestorFund: investment.netInvestorFund,
          presentValueFund,
          gainedFund,
          totalRedemptions,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          status: investment.status,
          isRollover: investment.isRollover || false,
          rolloverSequence: investment.rolloverSequence || 0,
          createdAt: investment.createdAt,
          currentMonthPerformance: {
            growthRate: growthData.growthPercentage,
            performanceRate: growthData.performancePercentage,
            appliedRule: growthData.appliedRule,
            hasPerformanceData: growthData.hasData,
            message: growthData.message,
            redemptions: currentMonthRedemptions,
          },
        };
      })
    );

    // Calculate totals from the processed investments
    totalPresentValueFund = investments.reduce(
      (sum, inv) => sum + inv.presentValueFund,
      0
    );
    totalGainedFund = investments.reduce((sum, inv) => sum + inv.gainedFund, 0);
    const totalRedemptions = investments.reduce(
      (sum, inv) => sum + inv.totalRedemptions,
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
        totalRedemptions,
        activeAccountsCount: investments.filter(
          (inv) => inv.status === "active"
        ).length,
        currentMonthPerformance: {
          growthRate: growthData.growthPercentage,
          performanceRate: growthData.performancePercentage,
          appliedRule: growthData.appliedRule,
          hasPerformanceData: growthData.hasData,
          message: growthData.message,
          redemptions: investments.flatMap(
            (inv) => inv.currentMonthPerformance.redemptions
          ),
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
