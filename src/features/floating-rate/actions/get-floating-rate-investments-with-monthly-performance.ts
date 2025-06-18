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

interface MonthlyPerformance {
  month: Date;
  monthLabel: string;
  performancePercentage: number;
  growthPercentage: number;
  gainedFund: number;
  totalActivePrinciple: number;
  appliedRule: string;
  hasData: boolean;
}

interface FloatingRateInvestmentWithMonthly {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean;
  rolloverSequence: number;
  createdAt: Date;
  monthlyPerformance: MonthlyPerformance[];
  totalMonthsActive: number;
}

interface FloatingRateInvestmentsWithMonthlyResult {
  success: boolean;
  message: string;
  data?: {
    investments: FloatingRateInvestmentWithMonthly[];
    totalGrossCapital: number;
    totalNetCapital: number;
    totalAdminFees: number;
    activeAccountsCount: number;
    availableMonths: string[];
  };
}

/**
 * Get all floating rate investments with monthly performance data
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
    let totalNetCapital = 0;
    let totalAdminFees = 0;
    const availableMonthsSet = new Set<string>();

    // First, collect all investments with their basic data
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

    // Instead of getting months from investments, get all months from earliest investment to current
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

    // Get all available months and calculate monthly performance for each
    // Sort months chronologically, not alphabetically
    const sortedAvailableMonths = Array.from(availableMonthsSet).sort(
      (a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      }
    );
    const monthlyPerformanceByMonth = new Map<
      string,
      {
        month: Date;
        monthLabel: string;
        performancePercentage: number;
        growthPercentage: number;
        totalActivePrinciple: number;
        appliedRule: string;
        hasData: boolean;
      }
    >();

    // Calculate performance for each month
    for (const monthLabel of sortedAvailableMonths) {
      const monthDate = new Date(monthLabel);
      const monthStart = startOfMonth(monthDate);

      // Find all investments active during this month
      let totalActivePrinciple = 0;

      for (const investment of investmentData) {
        const investmentStart = startOfMonth(investment.transactionDate);
        const investmentEnd = investment.endDate
          ? startOfMonth(investment.endDate)
          : null; // No end date means still active

        const isActiveInMonth =
          !isAfter(investmentStart, monthStart) &&
          (investmentEnd === null || !isBefore(investmentEnd, monthStart));

        if (isActiveInMonth) {
          totalActivePrinciple += investment.netCapital;
        }
      }

      try {
        // Get performance data for this month
        const growthResult = await getFloatingRateGrowthPercentage(monthStart);

        if (growthResult.success && growthResult.data) {
          monthlyPerformanceByMonth.set(monthLabel, {
            month: monthStart,
            monthLabel,
            performancePercentage: growthResult.data.performancePercentage,
            growthPercentage: growthResult.data.growthPercentage,
            totalActivePrinciple,
            appliedRule: growthResult.data.calculation.rule,
            hasData: true,
          });
        } else {
          monthlyPerformanceByMonth.set(monthLabel, {
            month: monthStart,
            monthLabel,
            performancePercentage: 0,
            growthPercentage: 0,
            totalActivePrinciple,
            appliedRule: "No data",
            hasData: false,
          });
        }
      } catch (error) {
        console.error(`Error getting performance for ${monthLabel}:`, error);
        monthlyPerformanceByMonth.set(monthLabel, {
          month: monthStart,
          monthLabel,
          performancePercentage: 0,
          growthPercentage: 0,
          totalActivePrinciple,
          appliedRule: "Error",
          hasData: false,
        });
      }
    }

    // Now create the final investment objects with their individual monthly performance
    const investments: FloatingRateInvestmentWithMonthly[] = investmentData.map(
      (investment) => {
        const monthlyPerformance: MonthlyPerformance[] = [];

        // Generate monthly performance data for each available month where this investment was active
        for (const monthLabel of sortedAvailableMonths) {
          const monthStart = startOfMonth(new Date(monthLabel));
          const investmentStart = startOfMonth(investment.transactionDate);
          const investmentEnd = investment.endDate
            ? startOfMonth(investment.endDate)
            : null; // No end date means still active

          const isActiveInMonth =
            !isAfter(investmentStart, monthStart) &&
            (investmentEnd === null || !isBefore(investmentEnd, monthStart));

          if (isActiveInMonth) {
            const monthData = monthlyPerformanceByMonth.get(monthLabel);

            if (monthData) {
              // Calculate this investment's share of the gained fund
              const investmentShare =
                monthData.totalActivePrinciple > 0
                  ? investment.netCapital / monthData.totalActivePrinciple
                  : 0;

              // Calculate total gained fund for the month (applying growth to total active principle)
              const totalGainedFund = monthData.hasData
                ? monthData.totalActivePrinciple *
                  (1 + monthData.growthPercentage / 100)
                : monthData.totalActivePrinciple;

              // Calculate this investment's gained fund
              const gainedFund = totalGainedFund * investmentShare;

              monthlyPerformance.push({
                month: monthData.month,
                monthLabel,
                performancePercentage: monthData.performancePercentage,
                growthPercentage: monthData.growthPercentage,
                gainedFund,
                totalActivePrinciple: monthData.totalActivePrinciple,
                appliedRule: monthData.appliedRule,
                hasData: monthData.hasData,
              });
            }
          }
        }

        return {
          id: investment.id,
          accountNumber: investment.accountNumber,
          investorEmail: investment.investorEmail || "N/A",
          grossCapital: investment.grossCapital,
          adminFee: investment.adminFeeAmount,
          netCapital: investment.netCapital,
          transactionDate: investment.transactionDate,
          endDate: investment.endDate,
          status: investment.status,
          isRollover: investment.isRollover || false,
          rolloverSequence: investment.rolloverSequence || 0,
          createdAt: investment.createdAt,
          monthlyPerformance,
          totalMonthsActive: monthlyPerformance.length,
        };
      }
    );

    return {
      success: true,
      message: `Successfully retrieved ${investments.length} floating rate investments with monthly performance data`,
      data: {
        investments,
        totalGrossCapital,
        totalNetCapital,
        totalAdminFees,
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
