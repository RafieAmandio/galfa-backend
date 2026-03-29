"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { getBatchFloatingRateGrowthPercentages } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { startOfMonth, addMonths, isAfter, format } from "date-fns";

export interface StatementMonthData {
  month: string; // "January", "February", etc.
  totalInvested: number;
  totalProfit: number;
  redeemed: number;
  presentValue: number;
  profitRatio: number;
  hasData: boolean;
}

export interface StatementYearData {
  year: number;
  months: StatementMonthData[];
}

export interface StatementOfAccountData {
  investorName: string;
  years: StatementYearData[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function getStatementOfAccountData(
  investorEmail: string
): Promise<{ success: boolean; data?: StatementOfAccountData; error?: string }> {
  try {
    const db = createDrizzleConnection();

    // Get all floating rate accounts for this investor
    const results = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.account_number,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        adminFee: floatingRateAccounts.admin_fee,
        fullName: profiles.full_name,
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
        data: {
          investorName: "",
          years: [],
        },
      };
    }

    const investorName = results[0].fullName || investorEmail;

    // Process account data
    const investmentAccounts = results.map((result) => {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFeeAmount = parseFloat(result.adminFee);
      const netInvestorFund = grossCapital - adminFeeAmount;
      return {
        id: result.id,
        netInvestorFund,
        transactionDate: result.transactionDate,
        endDate: result.endDate,
        status: result.status,
      };
    });

    // Find date range
    const earliestDate = investmentAccounts.reduce(
      (earliest, acc) =>
        acc.transactionDate < earliest ? acc.transactionDate : earliest,
      investmentAccounts[0].transactionDate
    );
    const currentDate = new Date();

    // Batch-fetch growth rates and redemptions
    const accountIds = investmentAccounts.map((a) => a.id);
    const [growthRatesMap, redemptionMap] = await Promise.all([
      getBatchFloatingRateGrowthPercentages(earliestDate, currentDate),
      getBatchRedemptions(accountIds),
    ]);

    // Calculate monthly breakdown for each account
    const accountMonthlyData = await Promise.all(
      investmentAccounts.map(async (account) => {
        const valueWithRedemptions =
          await calculateFloatingRateValueWithRedemptions(
            account.id,
            account.netInvestorFund,
            account.transactionDate,
            currentDate,
            redemptionMap.get(account.id),
            growthRatesMap
          );

        return {
          ...account,
          monthlyBreakdown: valueWithRedemptions.monthlyBreakdown,
          totalRedemptions: valueWithRedemptions.totalRedemptions,
        };
      })
    );

    // Aggregate by month across all accounts
    // Build a map of month -> aggregated data
    const monthlyAggregated = new Map<
      string,
      {
        totalInvested: number;
        presentValue: number;
        cumulativeRedemptions: number;
        hasData: boolean;
      }
    >();

    // Track cumulative redemptions per account
    const accountCumulativeRedemptions = new Map<number, number>();

    // Iterate through each month from earliest to current
    let monthCursor = startOfMonth(earliestDate);
    const endMonth = startOfMonth(currentDate);

    while (!isAfter(monthCursor, endMonth)) {
      const monthKey = format(monthCursor, "MMMM yyyy");
      let totalInvested = 0;
      let presentValue = 0;
      let cumulativeRedemptions = 0;
      let hasData = false;

      for (const account of accountMonthlyData) {
        // Check if account was active during this month
        const accountStart = startOfMonth(account.transactionDate);
        if (isAfter(accountStart, monthCursor)) {
          continue; // Account hasn't started yet
        }

        // Find this month's data in the account's breakdown
        const monthData = account.monthlyBreakdown.find(
          (m) => m.monthYear === monthKey
        );

        if (monthData) {
          totalInvested += account.netInvestorFund;
          presentValue += monthData.endingBalance;
          hasData = hasData || monthData.hasData;

          // Track cumulative redemptions for this account
          const prevCumulative =
            accountCumulativeRedemptions.get(account.id) || 0;
          const newCumulative = prevCumulative + monthData.redemptions;
          accountCumulativeRedemptions.set(account.id, newCumulative);
          cumulativeRedemptions += newCumulative;
        } else {
          // Account exists but no monthly data (shouldn't happen normally)
          totalInvested += account.netInvestorFund;
        }
      }

      if (totalInvested > 0) {
        monthlyAggregated.set(monthKey, {
          totalInvested,
          presentValue,
          cumulativeRedemptions,
          hasData,
        });
      }

      monthCursor = addMonths(monthCursor, 1);
    }

    // Group by year
    const yearMap = new Map<number, StatementMonthData[]>();

    for (const [monthKey, data] of monthlyAggregated) {
      const date = new Date(monthKey);
      const year = date.getFullYear();
      const monthName = MONTH_NAMES[date.getMonth()];

      const totalProfit = data.presentValue - data.totalInvested;
      const profitRatio =
        data.totalInvested > 0 ? (totalProfit / data.totalInvested) * 100 : 0;

      const monthData: StatementMonthData = {
        month: monthName,
        totalInvested: data.totalInvested,
        totalProfit,
        redeemed: data.cumulativeRedemptions,
        presentValue: data.presentValue,
        profitRatio,
        hasData: data.hasData,
      };

      if (!yearMap.has(year)) {
        yearMap.set(year, []);
      }
      yearMap.get(year)!.push(monthData);
    }

    // Convert to sorted array of years
    const years: StatementYearData[] = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, months]) => ({ year, months }));

    return {
      success: true,
      data: {
        investorName,
        years,
      },
    };
  } catch (error) {
    console.error("Error fetching statement of account data:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch statement of account data",
    };
  }
}
