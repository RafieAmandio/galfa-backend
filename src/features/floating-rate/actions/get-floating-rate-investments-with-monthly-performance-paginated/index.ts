"use server";

import { cache } from "react";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  isAfter,
  addMonths,
  format,
  isValid,
} from "date-fns";
import { getFloatingRateGrowthPercentageInternal } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";

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
  redemptions?: Array<{
    amount: number;
    transactionDate: Date;
    status: string;
    description?: string;
  }>;
}

interface FloatingRateInvestmentWithMonthly {
  id: number;
  accountNumber: string;
  investorEmail: string | null;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date | null;
  status: string;
  isRollover: boolean | null;
  rolloverSequence: number | null;
  createdAt: Date;
  monthlyPerformance: MonthlyPerformance[];
  totalMonthsActive: number;
  presentValueFund: number;
  totalGainedFund: number;
}

interface PaginatedFloatingRateInvestmentsResult {
  success: boolean;
  message?: string;
  data?: {
    investments: FloatingRateInvestmentWithMonthly[];
    totalGrossCapital: number;
    totalNetInvestorFund: number;
    totalAdminFees: number;
    totalPresentValueFund: number;
    totalGainedFund: number;
    activeAccountsCount: number;
    availableMonths: string[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get paginated floating rate investments with monthly performance data
 */
export const getFloatingRateInvestmentsWithMonthlyPerformancePaginated = cache(
  async function (
    params: PaginationParams = {}
  ): Promise<PaginatedFloatingRateInvestmentsResult> {
    // Check admin access
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return {
        success: false,
        message: "Unauthorized: Admin access required",
      };
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "transaction_date",
      sortOrder = "desc",
      search = "",
      status = "",
      dateFrom = "",
      dateTo = "",
    } = params;

    const db = createDrizzleConnection();

    try {
      // Build where conditions
      const whereConditions = [];

      if (search) {
        whereConditions.push(
          sql`(${accounts.account_number} ILIKE ${`%${search}%`} OR ${
            authUsers.email
          } ILIKE ${`%${search}%`})`
        );
      }

      if (status) {
        whereConditions.push(eq(accounts.status, status));
      }

      if (dateFrom) {
        // Validate dateFrom format
        const fromDate = new Date(dateFrom);
        if (isValid(fromDate)) {
          whereConditions.push(
            sql`${accounts.transaction_date} >= ${dateFrom}`
          );
        }
      }

      if (dateTo) {
        // Validate dateTo format
        const toDate = new Date(dateTo);
        if (isValid(toDate)) {
          whereConditions.push(sql`${accounts.transaction_date} <= ${dateTo}`);
        }
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(accounts)
        .innerJoin(
          floatingRateAccounts,
          eq(accounts.id, floatingRateAccounts.account_id)
        )
        .innerJoin(profiles, eq(accounts.user_id, profiles.id))
        .innerJoin(authUsers, eq(profiles.id, authUsers.id))
        .where(whereClause);

      const totalCount = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      // Build order by clause
      let orderByClause;
      switch (sortBy) {
        case "account_number":
          orderByClause =
            sortOrder === "asc"
              ? asc(accounts.account_number)
              : desc(accounts.account_number);
          break;
        case "investor_email":
          orderByClause =
            sortOrder === "asc" ? asc(authUsers.email) : desc(authUsers.email);
          break;
        case "gross_capital":
          orderByClause =
            sortOrder === "asc"
              ? asc(accounts.capital)
              : desc(accounts.capital);
          break;
        case "transaction_date":
        default:
          orderByClause =
            sortOrder === "asc"
              ? asc(accounts.transaction_date)
              : desc(accounts.transaction_date);
          break;
      }

      // Get paginated results
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
          adminFee: floatingRateAccounts.admin_fee,
        })
        .from(accounts)
        .innerJoin(
          floatingRateAccounts,
          eq(accounts.id, floatingRateAccounts.account_id)
        )
        .innerJoin(profiles, eq(accounts.user_id, profiles.id))
        .innerJoin(authUsers, eq(profiles.id, authUsers.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get all available months for the current results
      const currentMonth = startOfMonth(new Date());
      const availableMonthsSet = new Set<string>();

      // Find the earliest transaction date from current results
      let earliestDate: Date;

      if (results.length > 0) {
        // Find the earliest valid transaction date
        const validResults = results.filter((result) =>
          isValid(result.transactionDate)
        );
        if (validResults.length > 0) {
          earliestDate = validResults.reduce((earliest, result) =>
            result.transactionDate < earliest.transactionDate
              ? result
              : earliest
          ).transactionDate;
        } else {
          // Fallback to current month if no valid dates
          earliestDate = startOfMonth(new Date());
        }
      } else {
        // No results, use current month as fallback
        earliestDate = startOfMonth(new Date());
      }

      // Ensure we have a valid earliest date
      const validEarliestDate = isValid(earliestDate)
        ? earliestDate
        : startOfMonth(new Date());

      // Generate monthly growth rates for the period
      const monthlyGrowthRates: Array<{
        month: Date;
        growthPercentage: number;
        performancePercentage: number;
        hasData: boolean;
      }> = [];

      let monthToCheck = startOfMonth(validEarliestDate);

      // Add safety check to prevent infinite loops
      let iterationCount = 0;
      const maxIterations = 120; // 10 years max

      while (
        !isAfter(monthToCheck, currentMonth) &&
        iterationCount < maxIterations
      ) {
        // Validate the date before using it
        if (!isValid(monthToCheck)) {
          console.error(`Invalid date detected: ${monthToCheck}`);
          break;
        }

        try {
          const growthResult = await getFloatingRateGrowthPercentageInternal(
            monthToCheck
          );
          monthlyGrowthRates.push({
            month: monthToCheck,
            growthPercentage: growthResult.data?.growthPercentage || 0,
            performancePercentage:
              growthResult.data?.performancePercentage || 0,
            hasData: growthResult.success,
          });
          availableMonthsSet.add(format(monthToCheck, "MMMM yyyy"));
        } catch (error) {
          console.error(
            `Error getting growth rate for ${monthToCheck}:`,
            error
          );
          monthlyGrowthRates.push({
            month: monthToCheck,
            growthPercentage: 0,
            performancePercentage: 0,
            hasData: false,
          });
        }

        monthToCheck = addMonths(monthToCheck, 1);
        iterationCount++;
      }

      // Process each investment, filtering out invalid dates
      const investmentData = results
        .filter((result) => isValid(result.transactionDate))
        .map((result) => ({
          id: result.id,
          accountNumber: result.accountNumber,
          investorEmail: result.investorEmail,
          grossCapital: Number(result.grossCapital),
          adminFee: Number(result.adminFee),
          netInvestorFund:
            Number(result.grossCapital) - Number(result.adminFee),
          transactionDate: result.transactionDate,
          endDate: result.endDate,
          status: result.status,
          isRollover: result.isRollover,
          rolloverSequence: result.rolloverSequence,
          createdAt: result.createdAt,
        }));

      let totalGrossCapital = 0;
      let totalNetInvestorFund = 0;
      let totalAdminFees = 0;
      let totalPresentValueFund = 0;
      let totalGainedFund = 0;

      // Calculate monthly performance for each investment
      const investments: FloatingRateInvestmentWithMonthly[] =
        await Promise.all(
          investmentData.map(async (investment) => {
            totalGrossCapital += investment.grossCapital;
            totalNetInvestorFund += investment.netInvestorFund;
            totalAdminFees += investment.adminFee;

            let monthlyPerformance: MonthlyPerformance[] = [];
            let presentValueFund: number;
            let investmentGainedFund: number;

            try {
              const valueWithRedemptions =
                await calculateFloatingRateValueWithRedemptions(
                  investment.id,
                  investment.netInvestorFund,
                  investment.transactionDate,
                  new Date()
                );

              presentValueFund = valueWithRedemptions.currentValue;
              investmentGainedFund =
                presentValueFund -
                investment.netInvestorFund +
                valueWithRedemptions.totalRedemptions;

              monthlyPerformance = valueWithRedemptions.monthlyBreakdown.map(
                (monthBreakdown) => {
                  const monthDate = new Date(monthBreakdown.monthYear + " 1");

                  // Validate the month date
                  if (!isValid(monthDate)) {
                    console.error(
                      `Invalid month date: ${monthBreakdown.monthYear}`
                    );
                    return {
                      month: new Date(),
                      monthLabel: "Invalid Date",
                      performanceRate: 0,
                      growthRate: 0,
                      previousMonthValue: 0,
                      presentValueFund: 0,
                      gainedFund: 0,
                      isFirstMonth: false,
                      daysActive: 0,
                      totalDaysInMonth: 30,
                      appliedRule: "Invalid Date",
                      hasData: false,
                      redemptions: [],
                    };
                  }

                  const growthRateData = monthlyGrowthRates.find(
                    (rate) =>
                      rate.month.getMonth() === monthDate.getMonth() &&
                      rate.month.getFullYear() === monthDate.getFullYear()
                  );

                  const transactionMonth = new Date(
                    investment.transactionDate.getFullYear(),
                    investment.transactionDate.getMonth()
                  );
                  const currentMonth = new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth()
                  );

                  // Validate transaction month
                  const isFirstMonth =
                    isValid(transactionMonth) && isValid(currentMonth)
                      ? transactionMonth.getTime() === currentMonth.getTime()
                      : false;

                  return {
                    month: monthDate,
                    monthLabel: format(monthDate, "MMM yyyy"),
                    performanceRate: growthRateData?.performancePercentage || 0,
                    growthRate: monthBreakdown.growthRate,
                    previousMonthValue:
                      (monthBreakdown as any).previousMonthValue || 0,
                    presentValueFund:
                      (monthBreakdown as any).presentValueFund || 0,
                    gainedFund: monthBreakdown.gainedFund,
                    isFirstMonth,
                    daysActive: (monthBreakdown as any).daysActive || 0,
                    totalDaysInMonth:
                      (monthBreakdown as any).totalDaysInMonth || 30,
                    appliedRule: monthBreakdown.appliedRule,
                    hasData: growthRateData?.hasData || false,
                    redemptions: Array.isArray(monthBreakdown.redemptions)
                      ? monthBreakdown.redemptions
                      : [],
                  };
                }
              );
            } catch (error) {
              console.error(
                `Error calculating performance for investment ${investment.id}:`,
                error
              );
              presentValueFund = investment.netInvestorFund;
              investmentGainedFund = 0;
            }

            totalPresentValueFund += presentValueFund;
            totalGainedFund += investmentGainedFund;

            return {
              ...investment,
              monthlyPerformance,
              totalMonthsActive: monthlyPerformance.length,
              presentValueFund,
              totalGainedFund: investmentGainedFund,
            };
          })
        );

      const activeAccountsCount = investments.filter(
        (inv) => inv.status === "active"
      ).length;

      return {
        success: true,
        data: {
          investments,
          totalGrossCapital,
          totalNetInvestorFund,
          totalAdminFees,
          totalPresentValueFund,
          totalGainedFund,
          activeAccountsCount,
          availableMonths: Array.from(availableMonthsSet).sort(),
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      };
    } catch (error) {
      console.error(
        "Error fetching paginated floating rate investments:",
        error
      );
      return {
        success: false,
        message: "Failed to fetch floating rate investments",
      };
    }
  }
);
