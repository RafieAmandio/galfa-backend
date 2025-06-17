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
import { startOfMonth, addMonths, isAfter, isBefore, format } from "date-fns";

interface MonthlyPerformance {
  month: Date;
  monthLabel: string;
  performancePercentage: number;
  growthPercentage: number;
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

    // Process each investment and calculate monthly performance
    const investments: FloatingRateInvestmentWithMonthly[] = await Promise.all(
      results.map(async (result) => {
        const grossCapital = parseFloat(result.grossCapital);
        const adminFeeAmount = parseFloat(result.adminFee);
        const netCapital = grossCapital - adminFeeAmount;

        totalGrossCapital += grossCapital;
        totalNetCapital += netCapital;
        totalAdminFees += adminFeeAmount;

        // Calculate the months this investment has been active
        const startMonth = startOfMonth(result.transactionDate);
        const endMonth = result.endDate
          ? startOfMonth(result.endDate)
          : startOfMonth(new Date()); // Use current month if still active

        const monthlyPerformance: MonthlyPerformance[] = [];
        let currentMonth = startMonth;

        // Generate monthly performance data for each month the investment was active
        while (!isAfter(currentMonth, endMonth)) {
          const monthLabel = format(currentMonth, "MMM yyyy");
          availableMonthsSet.add(monthLabel);

          try {
            // Get performance data for this specific month
            const growthResult = await getFloatingRateGrowthPercentage(
              currentMonth
            );

            if (growthResult.success && growthResult.data) {
              monthlyPerformance.push({
                month: currentMonth,
                monthLabel,
                performancePercentage: growthResult.data.performancePercentage,
                growthPercentage: growthResult.data.growthPercentage,
                appliedRule: growthResult.data.calculation.rule,
                hasData: true,
              });
            } else {
              // No data available for this month
              monthlyPerformance.push({
                month: currentMonth,
                monthLabel,
                performancePercentage: 0,
                growthPercentage: 0,
                appliedRule: "No data",
                hasData: false,
              });
            }
          } catch (error) {
            console.error(
              `Error getting performance for ${monthLabel}:`,
              error
            );
            monthlyPerformance.push({
              month: currentMonth,
              monthLabel,
              performancePercentage: 0,
              growthPercentage: 0,
              appliedRule: "Error",
              hasData: false,
            });
          }

          currentMonth = addMonths(currentMonth, 1);
        }

        return {
          id: result.id,
          accountNumber: result.accountNumber,
          investorEmail: result.investorEmail || "N/A",
          grossCapital,
          adminFee: adminFeeAmount,
          netCapital,
          transactionDate: result.transactionDate,
          endDate: result.endDate,
          status: result.status,
          isRollover: result.isRollover || false,
          rolloverSequence: result.rolloverSequence || 0,
          createdAt: result.createdAt,
          monthlyPerformance,
          totalMonthsActive: monthlyPerformance.length,
        };
      })
    );

    const availableMonths = Array.from(availableMonthsSet).sort();

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
        availableMonths,
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
