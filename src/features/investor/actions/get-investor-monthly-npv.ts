"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";

export interface MonthlyBreakdownEntry {
  monthYear: string;
  startingBalance: number;
  interestEarned: number;
  endingBalance: number;
  redemptions: number;
  daysInPeriod: number;
}

export interface InvestmentMonthlyNPV {
  accountNumber: string;
  grossCapital: number;
  annualRate: number;
  startDate: string;
  endDate: string | null;
  monthlyBreakdown: MonthlyBreakdownEntry[];
}

export interface InvestorMonthlyNPVResult {
  investments: InvestmentMonthlyNPV[];
}

export async function getInvestorMonthlyNPV(
  investorEmail: string
): Promise<InvestorMonthlyNPVResult | null> {
  const db = createDrizzleConnection();

  // Get all active flat-rate investments for this investor
  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      grossCapital: accounts.capital,
      startDate: accounts.transaction_date,
      endDate: accounts.end_date,
      annualRate: fixRateAccounts.annual_rate,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      parentAccountId: accounts.parent_account_id,
    })
    .from(accounts)
    .innerJoin(profiles, eq(accounts.user_id, profiles.id))
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(
      and(eq(authUsers.email, investorEmail), eq(accounts.status, "active"))
    );

  if (results.length === 0) {
    return null;
  }

  // Find parent accounts that have rollover children (same logic as getInvestorSummary)
  const parentAccountIds = new Set(
    results
      .filter((r) => r.isRollover && r.parentAccountId)
      .map((r) => r.parentAccountId)
  );

  const activeAccounts = results.filter(
    (result) => !parentAccountIds.has(result.id)
  );

  // Batch-fetch all redemptions
  const accountIds = activeAccounts.map((r) => r.id);
  const redemptionMap = await getBatchRedemptions(accountIds);

  const investmentPromises = activeAccounts.map(async (result) => {
    const grossCapital = Number(result.grossCapital);
    const annualRate = Number(result.annualRate);
    const isRollover = result.isRollover || false;
    const adminFeeApplied = result.adminFeeApplied !== false;

    const npvResult = await calculateNetPresentValueWithRedemptions(
      result.id,
      grossCapital,
      annualRate,
      result.startDate,
      new Date(),
      isRollover,
      adminFeeApplied,
      redemptionMap.get(result.id)
    );

    return {
      accountNumber: result.accountNumber,
      grossCapital,
      annualRate,
      startDate: result.startDate.toISOString(),
      endDate: result.endDate ? result.endDate.toISOString() : null,
      monthlyBreakdown: npvResult.monthlyBreakdown.map((m) => ({
        monthYear: m.monthYear,
        startingBalance: m.startingBalance,
        interestEarned: m.interestEarned,
        endingBalance: m.endingBalance,
        redemptions: m.redemptions,
        daysInPeriod: m.daysInPeriod,
      })),
    };
  });

  const investments = await Promise.all(investmentPromises);

  return { investments };
}
