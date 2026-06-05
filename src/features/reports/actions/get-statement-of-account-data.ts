"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  fixRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { getBatchFloatingRateGrowthPercentages } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";
import { startOfMonth, addMonths, isAfter, format } from "date-fns";

export interface StatementMonthData {
  month: string;
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

// Common monthly breakdown shape used for aggregation
interface MonthlyEntry {
  monthYear: string;
  endingBalance: number;
  redemptions: number;
  hasData: boolean;
}

export async function getStatementOfAccountData(
  investorEmail: string
): Promise<{ success: boolean; data?: StatementOfAccountData; error?: string }> {
  try {
    const db = createDrizzleConnection();

    // Get floating rate accounts
    const floatingResults = await db
      .select({
        id: accounts.id,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        adminFee: floatingRateAccounts.admin_fee,
        isRollover: accounts.is_rollover,
        parentAccountId: accounts.parent_account_id,
        fullName: profiles.full_name,
      })
      .from(accounts)
      .innerJoin(floatingRateAccounts, eq(accounts.id, floatingRateAccounts.account_id))
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.email, investorEmail))
      .orderBy(accounts.transaction_date);

    // Get fix rate accounts
    const fixResults = await db
      .select({
        id: accounts.id,
        grossCapital: accounts.capital,
        transactionDate: accounts.transaction_date,
        endDate: accounts.end_date,
        status: accounts.status,
        annualRate: fixRateAccounts.annual_rate,
        adminFee: fixRateAccounts.admin_fee,
        isRollover: accounts.is_rollover,
        adminFeeApplied: accounts.admin_fee_applied,
        fullName: profiles.full_name,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.email, investorEmail))
      .orderBy(accounts.transaction_date);

    if (floatingResults.length === 0 && fixResults.length === 0) {
      return {
        success: true,
        data: { investorName: "", years: [] },
      };
    }

    const investorName =
      floatingResults[0]?.fullName || fixResults[0]?.fullName || investorEmail;

    // Collect all account IDs for batch redemption fetch
    const allAccountIds = [
      ...floatingResults.map((r) => r.id),
      ...fixResults.map((r) => r.id),
    ];

    const currentDate = new Date();

    // Find earliest date across all accounts
    const allDates = [
      ...floatingResults.map((r) => r.transactionDate),
      ...fixResults.map((r) => r.transactionDate),
    ];
    const earliestDate = allDates.reduce((a, b) => (a < b ? a : b));

    // Batch-fetch growth rates and redemptions
    const [growthRatesMap, redemptionMap] = await Promise.all([
      getBatchFloatingRateGrowthPercentages(earliestDate, currentDate),
      getBatchRedemptions(allAccountIds),
    ]);

    // Build a map of account id -> capital for resolving rollover parents
    const allAccountCapitalMap = new Map<number, number>();
    for (const r of fixResults) {
      const gross = parseFloat(r.grossCapital);
      const isRollover = r.isRollover || false;
      const adminFeeApplied = r.adminFeeApplied !== false;
      const adminFeeRate = !isRollover && adminFeeApplied ? ADMIN_FEE_PERCENTAGE : 0;
      allAccountCapitalMap.set(r.id, gross * (1 - adminFeeRate));
    }
    for (const r of floatingResults) {
      const gross = parseFloat(r.grossCapital);
      const adminFeeAmount = parseFloat(r.adminFee);
      allAccountCapitalMap.set(r.id, gross - adminFeeAmount);
    }

    // Calculate monthly breakdowns for each account
    // reportedInvested = original parent capital for rollovers, own capital otherwise
    const accountData: Array<{
      id: number;
      netInvestorFund: number;
      reportedInvested: number;
      parentAccountId: number | null;
      transactionDate: Date;
      endDate: Date | null;
      monthlyEntries: MonthlyEntry[];
    }> = [];

    // Process floating rate accounts
    for (const result of floatingResults) {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFeeAmount = parseFloat(result.adminFee);
      const netInvestorFund = grossCapital - adminFeeAmount;

      // For rollovers, use the parent's original capital as "reported invested"
      let reportedInvested = netInvestorFund;
      const isRollover = result.isRollover || false;
      if (isRollover && result.parentAccountId) {
        const parentCapital = allAccountCapitalMap.get(result.parentAccountId);
        if (parentCapital) {
          reportedInvested = parentCapital;
        }
      }

      // Stop calculation at end_date if account has ended
      const calcEndDate = result.endDate && result.endDate < currentDate
        ? result.endDate
        : currentDate;

      const valueWithRedemptions = await calculateFloatingRateValueWithRedemptions(
        result.id,
        netInvestorFund,
        result.transactionDate,
        calcEndDate,
        redemptionMap.get(result.id),
        growthRatesMap,
        result.endDate
      );

      let entries = valueWithRedemptions.monthlyBreakdown.map((m) => ({
        monthYear: m.monthYear,
        endingBalance: m.endingBalance,
        redemptions: m.redemptions,
        hasData: m.hasData,
      }));

      // For rollovers, the first month should use full monthly rate (not partial)
      // because the capital was already invested via the parent account.
      // We recalculate the entire chain since each month depends on the previous.
      if (isRollover && entries.length > 0) {
        const breakdown = valueWithRedemptions.monthlyBreakdown;
        let balance = netInvestorFund;

        for (let i = 0; i < breakdown.length; i++) {
          const m = breakdown[i];
          // Apply redemptions first
          balance -= m.redemptions;
          if (balance < 0) balance = 0;

          // Apply full month growth (no partial, even for first month)
          if (m.growthRate > 0) {
            balance = balance * (1 + m.growthRate / 100);
          }

          entries[i].endingBalance = balance;
        }
      }

      accountData.push({
        id: result.id,
        netInvestorFund,
        reportedInvested,
        parentAccountId: result.parentAccountId,
        transactionDate: result.transactionDate,
        endDate: result.endDate,
        monthlyEntries: entries,
      });
    }

    // Process fix rate accounts
    // Interest is always calculated on the ORIGINAL principal (not reduced by redemptions)
    // This matches the business logic: investors earn fixed interest on locked-in capital
    for (const result of fixResults) {
      const grossCapital = parseFloat(result.grossCapital);
      const annualRate = parseFloat(result.annualRate);
      const isRollover = result.isRollover || false;
      const adminFeeApplied = result.adminFeeApplied !== false;
      const adminFeeRate = !isRollover && adminFeeApplied ? ADMIN_FEE_PERCENTAGE : 0;
      const netInvestorFund = grossCapital * (1 - adminFeeRate);
      const monthlyRate = annualRate / 12;

      const calcEndDate = result.endDate && result.endDate < currentDate
        ? result.endDate
        : currentDate;

      // Get redemptions for this account
      const accountRedemptions = redemptionMap.get(result.id) || [];

      // Build monthly entries manually: interest always on original principal
      const entries: MonthlyEntry[] = [];
      let monthCur = startOfMonth(result.transactionDate);
      const endMon = startOfMonth(calcEndDate);
      let cumulativeGain = 0;
      let cumulativeRedemptions = 0;
      let isFirst = true;

      while (!isAfter(monthCur, endMon)) {
        const monthStart = monthCur;
        const monthEnd = new Date(monthCur.getFullYear(), monthCur.getMonth() + 1, 0);
        const totalDaysInMonth = monthEnd.getDate();

        // Calculate days active
        let daysActive: number;
        const isStartMonth = isFirst;
        const isEndMonth = monthCur.getTime() === endMon.getTime() &&
          calcEndDate.getTime() < new Date(monthCur.getFullYear(), monthCur.getMonth() + 1, 0).getTime();

        if (isStartMonth && isEndMonth) {
          daysActive = Math.max(0, calcEndDate.getDate() - result.transactionDate.getDate());
        } else if (isStartMonth) {
          daysActive = totalDaysInMonth - result.transactionDate.getDate();
        } else if (isEndMonth) {
          daysActive = calcEndDate.getDate();
        } else {
          daysActive = totalDaysInMonth;
        }

        // Interest on ORIGINAL principal (not reduced by redemptions)
        const effectiveRate = (daysActive / totalDaysInMonth) * monthlyRate;
        const monthlyGain = netInvestorFund * effectiveRate;
        cumulativeGain += monthlyGain;

        // Track redemptions in this month
        const monthRedemptions = accountRedemptions.filter((r) => {
          const rd = new Date(r.transactionDate);
          return rd >= monthStart && rd <= monthEnd;
        });
        const redemptionAmount = monthRedemptions.reduce((sum, r) => sum + r.amount, 0);
        cumulativeRedemptions += redemptionAmount;

        // Present value = original capital + cumulative gains - cumulative redemptions
        const presentValue = netInvestorFund + cumulativeGain - cumulativeRedemptions;

        entries.push({
          monthYear: format(monthCur, "MMMM yyyy"),
          endingBalance: presentValue,
          redemptions: redemptionAmount,
          hasData: true,
        });

        monthCur = addMonths(monthCur, 1);
        isFirst = false;
      }

      accountData.push({
        id: result.id,
        netInvestorFund,
        reportedInvested: netInvestorFund,
        parentAccountId: null,
        transactionDate: result.transactionDate,
        endDate: result.endDate,
        monthlyEntries: entries,
      });
    }

    // Aggregate by month across all accounts
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

    let monthCursor = startOfMonth(earliestDate);
    const endMonth = startOfMonth(currentDate);

    // Build a set of parent account IDs that have active rollover children
    const parentIdsWithRollover = new Set<number>();
    for (const account of accountData) {
      if (account.parentAccountId) {
        parentIdsWithRollover.add(account.parentAccountId);
      }
    }

    while (!isAfter(monthCursor, endMonth)) {
      const monthKey = format(monthCursor, "MMMM yyyy");
      let totalInvested = 0;
      let presentValue = 0;
      let cumulativeRedemptions = 0;
      let hasData = false;

      // Track which parent accounts have an active rollover child this month
      // so we don't double-count the "reported invested" amount
      const activeRolloverParents = new Set<number>();
      for (const account of accountData) {
        if (account.parentAccountId) {
          const accountStart = startOfMonth(account.transactionDate);
          if (!isAfter(accountStart, monthCursor)) {
            const monthData = account.monthlyEntries.find(
              (m) => m.monthYear === monthKey
            );
            if (monthData) {
              activeRolloverParents.add(account.parentAccountId);
            }
          }
        }
      }

      for (const account of accountData) {
        const accountStart = startOfMonth(account.transactionDate);
        if (isAfter(accountStart, monthCursor)) {
          continue;
        }

        // Skip parent account if its rollover child is active this month
        // (the child already uses parent's reportedInvested amount)
        if (activeRolloverParents.has(account.id)) {
          continue;
        }

        // Skip accounts that have ended before this month
        if (account.endDate && startOfMonth(account.endDate) < monthCursor) {
          continue;
        }

        const monthData = account.monthlyEntries.find(
          (m) => m.monthYear === monthKey
        );

        if (monthData) {
          totalInvested += account.reportedInvested;
          presentValue += monthData.endingBalance;
          hasData = hasData || monthData.hasData;

          const prevCumulative =
            accountCumulativeRedemptions.get(account.id) || 0;
          const newCumulative = prevCumulative + monthData.redemptions;
          accountCumulativeRedemptions.set(account.id, newCumulative);
          cumulativeRedemptions += newCumulative;
        } else {
          totalInvested += account.reportedInvested;
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

      // Total Profit = cumulative gains (not net of redemptions)
      // = Present Value + Cumulative Redemptions - Total Invested
      const totalProfit = data.presentValue + data.cumulativeRedemptions - data.totalInvested;
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

    const years: StatementYearData[] = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, months]) => ({ year, months }));

    return {
      success: true,
      data: { investorName, years },
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
