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
import { startOfMonth, addMonths, addDays, isAfter, differenceInMonths, format, parse } from "date-fns";

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

function getLocalDate(d: Date): number {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).getUTCDate();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Common monthly breakdown shape used for aggregation
interface MonthlyEntry {
  monthYear: string;
  gain: number;
  endingBalance: number;
  redemptions: number;
  hasData: boolean;
}

interface AccountDetail {
  id: number;
  accountNumber: string;
  netInvestorFund: number;
  reportedInvested: number;
  parentAccountId: number | null;
  transactionDate: Date;
  endDate: Date | null;
  monthlyEntries: MonthlyEntry[];
}

export async function getStatementOfAccountData(
  investorEmail: string
): Promise<{ success: boolean; data?: StatementOfAccountData; error?: string }> {
  try {
    const { investorName, years } = await computeStatement(investorEmail);
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

// Per-account monthly detail alongside the aggregated statement. Consumed by
// the Excel validation checker (scripts/excel-validation) to compare every
// fund's monthly gain against the finance team's reference workbooks.
export async function getStatementValidationData(investorEmail: string) {
  const { investorName, years, accounts } = await computeStatement(investorEmail);
  return {
    investorName,
    years,
    accounts: accounts.map((a) => ({
      id: a.id,
      accountNumber: a.accountNumber,
      netInvestorFund: a.netInvestorFund,
      transactionDate: a.transactionDate,
      endDate: a.endDate,
      parentAccountId: a.parentAccountId,
      monthly: a.monthlyEntries,
    })),
  };
}

// Shared computation used by both exports above
async function computeStatement(investorEmail: string) {
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
        accountNumber: accounts.account_number,
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
        parentAccountId: accounts.parent_account_id,
        accountNumber: accounts.account_number,
        fullName: profiles.full_name,
      })
      .from(accounts)
      .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
      .innerJoin(profiles, eq(accounts.user_id, profiles.id))
      .innerJoin(authUsers, eq(profiles.id, authUsers.id))
      .where(eq(authUsers.email, investorEmail))
      .orderBy(accounts.transaction_date);

    if (floatingResults.length === 0 && fixResults.length === 0) {
      return { investorName: "", years: [] as StatementYearData[], accounts: [] as AccountDetail[] };
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

    // Build maps for resolving rollover roots
    const allAccountCapitalMap = new Map<number, number>();
    const allAccountParentMap = new Map<number, number | null>();
    for (const r of fixResults) {
      const gross = parseFloat(r.grossCapital);
      const isRollover = r.isRollover || false;
      const adminFeeApplied = r.adminFeeApplied !== false;
      const adminFeeRate = !isRollover && adminFeeApplied ? ADMIN_FEE_PERCENTAGE : 0;
      allAccountCapitalMap.set(r.id, gross * (1 - adminFeeRate));
      allAccountParentMap.set(r.id, r.parentAccountId ?? null);
    }
    for (const r of floatingResults) {
      const gross = parseFloat(r.grossCapital);
      const adminFeeAmount = parseFloat(r.adminFee);
      allAccountCapitalMap.set(r.id, gross - adminFeeAmount);
      allAccountParentMap.set(r.id, r.parentAccountId ?? null);
    }

    // Resolve root capital: walk up the parent chain to find the original investment
    function getRootCapital(accountId: number): number | undefined {
      let currentId: number | null | undefined = accountId;
      const visited = new Set<number>();
      while (currentId != null && !visited.has(currentId)) {
        visited.add(currentId);
        const parentId = allAccountParentMap.get(currentId);
        if (parentId == null || !allAccountCapitalMap.has(parentId)) break;
        currentId = parentId;
      }
      return currentId != null ? allAccountCapitalMap.get(currentId) : undefined;
    }

    // Calculate monthly breakdowns for each account
    // reportedInvested = original parent capital for rollovers, own capital otherwise
    const accountData: AccountDetail[] = [];

    // Process floating rate accounts
    for (const result of floatingResults) {
      const grossCapital = parseFloat(result.grossCapital);
      const adminFeeAmount = parseFloat(result.adminFee);
      const netInvestorFund = grossCapital - adminFeeAmount;

      const isRollover = result.isRollover || false;
      let reportedInvested = netInvestorFund;
      if (isRollover && result.parentAccountId) {
        const rootCapital = getRootCapital(result.parentAccountId);
        if (rootCapital) reportedInvested = rootCapital;
      }

      const valueWithRedemptions = await calculateFloatingRateValueWithRedemptions(
        result.id,
        netInvestorFund,
        result.transactionDate,
        currentDate,
        redemptionMap.get(result.id),
        growthRatesMap,
        result.endDate
      );

      let entries = valueWithRedemptions.monthlyBreakdown.map((m) => ({
        monthYear: m.monthYear,
        gain: m.gainedFund,
        endingBalance: m.endingBalance,
        redemptions: m.redemptions,
        hasData: m.hasData,
      }));

      accountData.push({
        id: result.id,
        accountNumber: result.accountNumber,
        netInvestorFund,
        reportedInvested,
        parentAccountId: result.parentAccountId,
        transactionDate: result.transactionDate,
        endDate: result.endDate,
        monthlyEntries: entries,
      });
    }

    // Map to store each account's maturity ending balance (for rollover child capital)
    const accountMaturityValue = new Map<number, number>();

    // Process fix rate accounts (ordered by transaction_date, so parents come before children)
    // Interest is always calculated on the ORIGINAL principal (not reduced by redemptions)
    // This matches the business logic: investors earn fixed interest on locked-in capital
    for (const result of fixResults) {
      const grossCapital = parseFloat(result.grossCapital);
      const annualRate = parseFloat(result.annualRate);
      const isRollover = result.isRollover || false;
      const adminFeeApplied = result.adminFeeApplied !== false;
      const adminFeeRate = !isRollover && adminFeeApplied ? ADMIN_FEE_PERCENTAGE : 0;

      // For rollover accounts, use parent's calculated maturity value instead of DB capital
      let netInvestorFund: number;
      if (isRollover && result.parentAccountId && accountMaturityValue.has(result.parentAccountId)) {
        netInvestorFund = accountMaturityValue.get(result.parentAccountId)!;
      } else {
        netInvestorFund = grossCapital * (1 - adminFeeRate);
      }
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
        const isEndMonth = monthCur.getTime() === endMon.getTime();

        // getLocalDate normalizes both storage conventions (WIB-midnight 17:00Z
        // and UTC-midnight 00:00Z) to the intended WIB calendar day. Finance
        // convention (master Excel formula): interest accrues from the day
        // AFTER the deposit date through the maturity date INCLUSIVE.
        const bothOnFirst = getLocalDate(result.transactionDate) === 1 && getLocalDate(calcEndDate) === 1;
        if (isStartMonth && isEndMonth) {
          daysActive = Math.max(0, getLocalDate(calcEndDate) - getLocalDate(result.transactionDate));
          if (bothOnFirst) daysActive += 1;
        } else if (isStartMonth) {
          daysActive = Math.max(0, totalDaysInMonth - getLocalDate(result.transactionDate));
        } else if (isEndMonth) {
          daysActive = getLocalDate(calcEndDate);
          if (bothOnFirst) daysActive += 1;
        } else {
          daysActive = totalDaysInMonth;
        }

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
          gain: monthlyGain,
          endingBalance: presentValue,
          redemptions: redemptionAmount,
          hasData: true,
        });

        monthCur = addMonths(monthCur, 1);
        isFirst = false;
      }

      // Store maturity value for rollover children to use as their capital
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        accountMaturityValue.set(result.id, lastEntry.endingBalance);
      }

      let reportedInvested = netInvestorFund;
      if (isRollover && result.parentAccountId) {
        const rootCapital = getRootCapital(result.parentAccountId);
        if (rootCapital) reportedInvested = rootCapital;
      }

      accountData.push({
        id: result.id,
        accountNumber: result.accountNumber,
        netInvestorFund,
        reportedInvested,
        parentAccountId: result.parentAccountId ?? null,
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

    // Extend parent entries with a handoff month so the parent is counted
    // in the rollover month (the month the child starts)
    for (const account of accountData) {
      if (!account.parentAccountId) continue;
      const parent = accountData.find((a) => a.id === account.parentAccountId);
      if (!parent || parent.monthlyEntries.length === 0) continue;
      const lastEntry = parent.monthlyEntries[parent.monthlyEntries.length - 1];
      const childStartMonth = startOfMonth(account.transactionDate);
      const childMonthKey = format(childStartMonth, "MMMM yyyy");
      if (!parent.monthlyEntries.some((e) => e.monthYear === childMonthKey)) {
        parent.monthlyEntries.push({
          monthYear: childMonthKey,
          gain: 0,
          endingBalance: lastEntry.endingBalance,
          redemptions: 0,
          hasData: true,
        });
      }
    }

    while (!isAfter(monthCursor, endMonth)) {
      const monthKey = format(monthCursor, "MMMM yyyy");
      let totalInvested = 0;
      let presentValue = 0;
      let cumulativeRedemptions = 0;
      let hasData = false;

      const activeRolloverParents = new Set<number>();
      const parentsWithChildThisMonth = new Set<number>();
      for (const account of accountData) {
        if (account.parentAccountId) {
          const accountStart = startOfMonth(account.transactionDate);
          if (accountStart < monthCursor) {
            const monthData = account.monthlyEntries.find(
              (m) => m.monthYear === monthKey
            );
            if (monthData) {
              activeRolloverParents.add(account.parentAccountId);
            }
          } else if (accountStart.getTime() === monthCursor.getTime()) {
            parentsWithChildThisMonth.add(account.parentAccountId);
          }
        }
      }

      for (const account of accountData) {
        const accountStart = startOfMonth(account.transactionDate);
        if (isAfter(accountStart, monthCursor)) {
          continue;
        }

        if (activeRolloverParents.has(account.id)) {
          continue;
        }

        if (account.parentAccountId && !(accountStart < monthCursor)) {
          const monthData = account.monthlyEntries.find(
            (m) => m.monthYear === monthKey
          );
          if (monthData) {
            presentValue += monthData.endingBalance - account.netInvestorFund;
            const prevCumulative =
              accountCumulativeRedemptions.get(account.id) || 0;
            const newCumulative = prevCumulative + monthData.redemptions;
            accountCumulativeRedemptions.set(account.id, newCumulative);
            cumulativeRedemptions += newCumulative;
          }
          continue;
        }

        if (account.endDate && startOfMonth(account.endDate) < monthCursor
            && !parentsWithChildThisMonth.has(account.id)) {
          continue;
        }

        const monthData = account.monthlyEntries.find(
          (m) => m.monthYear === monthKey
        );

        if (!monthData) {
          continue;
        }

        totalInvested += account.reportedInvested;
        presentValue += monthData.endingBalance;
        hasData = hasData || monthData.hasData;

        const prevCumulative =
          accountCumulativeRedemptions.get(account.id) || 0;
        const newCumulative = prevCumulative + monthData.redemptions;
        accountCumulativeRedemptions.set(account.id, newCumulative);
        cumulativeRedemptions += newCumulative;
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
      const date = parse(monthKey, "MMMM yyyy", new Date());
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

    return { investorName, years, accounts: accountData };
}

export async function getStatementOfAccountDataDebug(investorEmail: string) {
  const db = createDrizzleConnection();

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
      accountNumber: accounts.account_number,
    })
    .from(accounts)
    .innerJoin(floatingRateAccounts, eq(accounts.id, floatingRateAccounts.account_id))
    .innerJoin(profiles, eq(accounts.user_id, profiles.id))
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .where(eq(authUsers.email, investorEmail))
    .orderBy(accounts.transaction_date);

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
      parentAccountId: accounts.parent_account_id,
      accountNumber: accounts.account_number,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .innerJoin(profiles, eq(accounts.user_id, profiles.id))
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .where(eq(authUsers.email, investorEmail))
    .orderBy(accounts.transaction_date);

  return {
    floating: floatingResults.map(r => ({
      id: r.id,
      accountNumber: r.accountNumber,
      grossCapital: r.grossCapital,
      netInvestorFund: parseFloat(r.grossCapital) - parseFloat(r.adminFee),
      transactionDate: r.transactionDate,
      endDate: r.endDate,
      isRollover: r.isRollover,
      parentAccountId: r.parentAccountId,
    })),
    fixRate: fixResults.map(r => ({
      id: r.id,
      accountNumber: r.accountNumber,
      grossCapital: r.grossCapital,
      annualRate: r.annualRate,
      transactionDate: r.transactionDate,
      endDate: r.endDate,
      isRollover: r.isRollover,
      adminFeeApplied: r.adminFeeApplied,
      parentAccountId: r.parentAccountId,
    })),
  };
}
