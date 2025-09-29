"use server";

import { cache } from "react";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
  mutations,
  vcPerformance,
} from "@/db/drizzle/schema";
import { eq, desc, asc, and, sql, gte, lt, inArray } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  isAfter,
  addMonths,
  format,
  isValid,
  subMonths,
} from "date-fns";
import {
  monthlyGrowthRatesCache,
  vcPerformanceDataCache,
  redemptionsCache,
  clearFloatingRateCaches,
} from "./cache";

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
 * OPTIMIZED: Get paginated floating rate investments with monthly performance data
 *
 * Key Optimizations:
 * 1. Batch fetch all redemptions for all investments in one query
 * 2. Batch fetch all VC performance data for all months in one query
 * 3. Pre-calculate all monthly growth rates once
 * 4. Use in-memory calculations instead of individual database calls
 * 5. Cache expensive calculations separately from pagination
 */
export const getFloatingRateInvestmentsWithMonthlyPerformancePaginatedOptimized =
  cache(async function (
    params: PaginationParams = {}
  ): Promise<PaginatedFloatingRateInvestmentsResult> {
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
        const fromDate = new Date(dateFrom);
        if (isValid(fromDate)) {
          whereConditions.push(
            sql`${accounts.transaction_date} >= ${dateFrom}`
          );
        }
      }

      if (dateTo) {
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

      if (results.length === 0) {
        return {
          success: true,
          data: {
            investments: [],
            totalGrossCapital: 0,
            totalNetInvestorFund: 0,
            totalAdminFees: 0,
            totalPresentValueFund: 0,
            totalGainedFund: 0,
            activeAccountsCount: 0,
            availableMonths: [],
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
      }

      // OPTIMIZATION 1: Batch fetch all redemptions for all investments (with caching)
      const accountIds = results.map((r) => r.id);
      const redemptionsCacheKey = `redemptions_${accountIds.sort().join("_")}`;

      let redemptionsByAccount = redemptionsCache.get(redemptionsCacheKey);

      if (!redemptionsByAccount) {
        const allRedemptions = await db
          .select({
            accountId: mutations.account_id,
            amount: mutations.amount,
            transactionDate: mutations.transaction_date,
            status: mutations.status,
            description: mutations.description,
          })
          .from(mutations)
          .where(
            and(
              inArray(mutations.account_id, accountIds),
              eq(mutations.type, "redemption"),
              eq(mutations.status, "completed")
            )
          )
          .orderBy(mutations.transaction_date);

        // Group redemptions by account ID
        redemptionsByAccount = allRedemptions.reduce((acc, redemption) => {
          if (redemption.accountId && !acc[redemption.accountId]) {
            acc[redemption.accountId] = [];
          }
          if (redemption.accountId) {
            acc[redemption.accountId].push({
              amount: Number(redemption.amount),
              transactionDate: redemption.transactionDate,
              status: redemption.status,
              description: redemption.description || undefined,
            });
          }
          return acc;
        }, {} as Record<number, Array<{ amount: number; transactionDate: Date; status: string; description?: string }>>);

        // Cache for 5 minutes
        redemptionsCache.set(redemptionsCacheKey, redemptionsByAccount);
        setTimeout(
          () => redemptionsCache.delete(redemptionsCacheKey),
          5 * 60 * 1000
        );
      }

      // OPTIMIZATION 2: Find date range and batch fetch VC performance data (with caching)
      const currentMonth = startOfMonth(new Date());
      const validResults = results.filter((r) => isValid(r.transactionDate));

      if (validResults.length === 0) {
        return {
          success: true,
          data: {
            investments: [],
            totalGrossCapital: 0,
            totalNetInvestorFund: 0,
            totalAdminFees: 0,
            totalPresentValueFund: 0,
            totalGainedFund: 0,
            activeAccountsCount: 0,
            availableMonths: [],
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
      }

      const earliestDate = validResults.reduce((earliest, result) =>
        result.transactionDate < earliest.transactionDate ? result : earliest
      ).transactionDate;

      // Generate all months from earliest to current
      const monthsToCalculate: Date[] = [];
      let monthToCheck = startOfMonth(earliestDate);
      let iterationCount = 0;
      const maxIterations = 120; // 10 years max

      while (
        !isAfter(monthToCheck, currentMonth) &&
        iterationCount < maxIterations
      ) {
        if (isValid(monthToCheck)) {
          monthsToCalculate.push(monthToCheck);
        }
        monthToCheck = addMonths(monthToCheck, 1);
        iterationCount++;
      }

      // Create cache keys for VC data and growth rates
      const vcCacheKey = `vc_${format(earliestDate, "yyyy-MM")}_${format(
        currentMonth,
        "yyyy-MM"
      )}`;
      const growthRatesCacheKey = `growth_${format(
        earliestDate,
        "yyyy-MM"
      )}_${format(currentMonth, "yyyy-MM")}`;

      // Check cache for VC performance data
      let vcDataByMonth = vcPerformanceDataCache.get(vcCacheKey);
      if (!vcDataByMonth) {
        const vcPerformanceData = await db
          .select({
            date: vcPerformance.date,
            aum: vcPerformance.aum,
            profitTaken: vcPerformance.profitTaken,
          })
          .from(vcPerformance)
          .where(
            and(
              gte(vcPerformance.date, startOfMonth(earliestDate)),
              lt(vcPerformance.date, addMonths(currentMonth, 1))
            )
          )
          .orderBy(vcPerformance.date);

        // Group VC performance data by month
        vcDataByMonth = vcPerformanceData.reduce((acc, data) => {
          const monthKey = format(data.date, "yyyy-MM");
          if (!acc[monthKey]) {
            acc[monthKey] = [];
          }
          acc[monthKey].push(data);
          return acc;
        }, {} as Record<string, typeof vcPerformanceData>);

        // Cache for 10 minutes
        vcPerformanceDataCache.set(vcCacheKey, vcDataByMonth);
        setTimeout(
          () => vcPerformanceDataCache.delete(vcCacheKey),
          10 * 60 * 1000
        );
      }

      // Check cache for monthly growth rates
      let monthlyGrowthRates = monthlyGrowthRatesCache.get(growthRatesCacheKey);
      if (!monthlyGrowthRates) {
        // OPTIMIZATION 4: Pre-calculate all monthly growth rates
        monthlyGrowthRates = monthsToCalculate.map((month) => {
          const monthKey = format(month, "yyyy-MM");
          const previousMonth = subMonths(month, 1);
          const previousMonthKey = format(previousMonth, "yyyy-MM");

          const currentMonthData = vcDataByMonth[monthKey]?.[0];
          const previousMonthData = vcDataByMonth[previousMonthKey]?.[0];

          if (!currentMonthData || !previousMonthData) {
            return {
              month,
              growthPercentage: 0,
              performancePercentage: 0,
              hasData: false,
            };
          }

          const currentAUM = Number(currentMonthData.aum);
          const previousAUM = Number(previousMonthData.aum);

          // Calculate performance percentage (annualized)
          const performancePercentage =
            previousAUM > 0
              ? ((currentAUM - previousAUM) / previousAUM) * 100 * 12
              : 0;

          // Apply business rules
          const growthPercentage =
            performancePercentage < 24 ? performancePercentage / 12 : 1.42;

          return {
            month,
            growthPercentage,
            performancePercentage,
            hasData: true,
          };
        });

        // Cache for 10 minutes
        monthlyGrowthRatesCache.set(growthRatesCacheKey, monthlyGrowthRates);
        setTimeout(
          () => monthlyGrowthRatesCache.delete(growthRatesCacheKey),
          10 * 60 * 1000
        );
      }

      // OPTIMIZATION 5: Process investments with pre-calculated data
      const investmentData = validResults.map((result) => ({
        id: result.id,
        accountNumber: result.accountNumber,
        investorEmail: result.investorEmail,
        grossCapital: Number(result.grossCapital),
        adminFee: Number(result.adminFee),
        netInvestorFund: Number(result.grossCapital) - Number(result.adminFee),
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

      // Calculate monthly performance for each investment using pre-calculated data
      const investments: FloatingRateInvestmentWithMonthly[] =
        investmentData.map((investment, index) => {
          totalGrossCapital += investment.grossCapital;
          totalNetInvestorFund += investment.netInvestorFund;
          totalAdminFees += investment.adminFee;

          // Get redemptions for this investment
          const redemptions = redemptionsByAccount[investment.id] || [];
          const totalRedemptions = redemptions.reduce(
            (sum, r) => sum + r.amount,
            0
          );

          // Calculate monthly performance using pre-calculated growth rates
          let currentValue = investment.netInvestorFund;
          let monthlyPerformance: MonthlyPerformance[] = [];
          let calculationDate = startOfMonth(investment.transactionDate);
          const endDate = startOfMonth(new Date());
          let isFirstMonth = true;
          let monthCount = 0;

          while (!isAfter(calculationDate, endDate)) {
            const monthStart = calculationDate;
            const monthEnd = new Date(
              calculationDate.getFullYear(),
              calculationDate.getMonth() + 1,
              0
            );

            // Find growth rate for this month
            const growthRateData = monthlyGrowthRates.find(
              (rate) =>
                rate.month.getMonth() === calculationDate.getMonth() &&
                rate.month.getFullYear() === calculationDate.getFullYear()
            );

            const startingBalance = currentValue;

            // Apply redemptions that occurred in this month
            const redemptionsInPeriod = redemptions.filter((r) => {
              const redemptionDate = new Date(r.transactionDate);
              return redemptionDate >= monthStart && redemptionDate <= monthEnd;
            });

            let redemptionsThisMonth = 0;
            let balanceAfterRedemptions = currentValue;

            redemptionsInPeriod.forEach((redemption) => {
              redemptionsThisMonth += redemption.amount;
              balanceAfterRedemptions -= redemption.amount;
              if (balanceAfterRedemptions < 0) {
                balanceAfterRedemptions = 0;
              }
            });

            // Calculate growth
            let gainedFund = 0;
            let newBalance = balanceAfterRedemptions;

            if (
              growthRateData?.hasData &&
              growthRateData.growthPercentage > 0
            ) {
              if (
                isFirstMonth &&
                calculationDate.getTime() ===
                  startOfMonth(investment.transactionDate).getTime()
              ) {
                // First month: partial month calculation
                const daysPassed = Math.max(
                  0,
                  Math.ceil(
                    (Math.min(new Date().getTime(), monthEnd.getTime()) -
                      investment.transactionDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                const totalDaysInMonth = monthEnd.getDate();
                const daysFraction = daysPassed / totalDaysInMonth;

                newBalance =
                  balanceAfterRedemptions *
                  Math.pow(
                    1 + growthRateData.growthPercentage / 100,
                    daysFraction
                  );
                gainedFund = newBalance - balanceAfterRedemptions;
              } else {
                // Subsequent months: full month calculation
                newBalance =
                  balanceAfterRedemptions *
                  (1 + growthRateData.growthPercentage / 100);
                gainedFund = newBalance - balanceAfterRedemptions;
              }
            }

            currentValue = newBalance;

            const monthKey = format(calculationDate, "MMM yyyy");
            const daysInPeriod = isFirstMonth
              ? Math.max(
                  0,
                  Math.ceil(
                    (Math.min(new Date().getTime(), monthEnd.getTime()) -
                      investment.transactionDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                )
              : monthEnd.getDate();

            monthlyPerformance.push({
              month: calculationDate,
              monthLabel: monthKey,
              performanceRate: growthRateData?.performancePercentage || 0,
              growthRate: growthRateData?.growthPercentage || 0,
              previousMonthValue: startingBalance,
              presentValueFund: currentValue,
              gainedFund,
              isFirstMonth,
              daysActive: daysInPeriod,
              totalDaysInMonth: monthEnd.getDate(),
              appliedRule: growthRateData?.hasData
                ? growthRateData.performancePercentage < 24
                  ? "Performance < 24%"
                  : "Performance ≥ 24%"
                : "No data available",
              hasData: growthRateData?.hasData || false,
              redemptions: redemptionsInPeriod,
            });

            calculationDate = addMonths(calculationDate, 1);
            isFirstMonth = false;
            monthCount++;
          }

          const presentValueFund = currentValue;
          const investmentGainedFund =
            presentValueFund - investment.netInvestorFund + totalRedemptions;

          totalPresentValueFund += presentValueFund;
          totalGainedFund += investmentGainedFund;

          return {
            ...investment,
            monthlyPerformance,
            totalMonthsActive: monthlyPerformance.length,
            presentValueFund,
            totalGainedFund: investmentGainedFund,
          };
        });

      const activeAccountsCount = investments.filter(
        (inv) => inv.status === "active"
      ).length;
      const availableMonths = Array.from(
        new Set(
          monthlyGrowthRates.map((rate) => format(rate.month, "MMMM yyyy"))
        )
      ).sort();

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
          availableMonths,
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
      console.error("Error fetching floating rate investments:", error);
      return {
        success: false,
        message: "Failed to fetch floating rate investments",
      };
    }
  });
