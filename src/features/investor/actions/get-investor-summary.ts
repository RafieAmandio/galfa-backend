"use server";

import { createDrizzleConnection, getDbConnectionDebug } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";

interface InvestorSummary {
  email: string;
  totalNetInvestedFund: number; // Total amount working for the investor (after admin fees)
  totalGrossInvestedFund: number; // Total gross investment amount
  totalAdminFees: number; // Total admin fees paid
  totalNetPresentValue: number; // Current value including compound interest
  totalGainLoss: number; // Total gain or loss (NPV - Net Invested)
  totalGainLossPercentage: number; // Percentage gain or loss
  activeInvestments: number; // Number of active investments
  investments: InvestmentDetail[];
}

interface InvestmentDetail {
  accountNumber: string;
  netInvestedAmount: number; // Amount working for investor
  grossInvestedAmount: number; // Original investment amount
  adminFee: number; // Admin fee paid
  startDate: Date;
  endDate: Date | null;
  annualRate: number;
  isRollover: boolean;
  rolloverSequence: number;
  currentValue: number; // Net Present Value including compound interest
  gainLoss: number; // Current gain or loss
  gainLossPercentage: number; // Percentage gain or loss
  daysInvested: number; // Total days the investment has been active
}

export async function getInvestorSummary(
  investorEmail: string
): Promise<InvestorSummary | null> {
  console.info("DB Connection Debug:", getDbConnectionDebug());
  const db = createDrizzleConnection();

  // Get all active investments for the investor
  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      grossCapital: accounts.capital,
      startDate: accounts.transaction_date,
      endDate: accounts.end_date,
      annualRate: fixRateAccounts.annual_rate,
      adminFeeRate: fixRateAccounts.admin_fee,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      rolloverSequence: accounts.rollover_sequence,
      parentAccountId: accounts.parent_account_id,
    })
    .from(accounts)
    .innerJoin(profiles, eq(accounts.user_id, profiles.id))
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(
      and(eq(authUsers.email, investorEmail), eq(accounts.status, "active"))
    );

  console.info("Investor flat-rate active rows:", results.length);
  if (results.length > 0) {
    const sample = results[0];
    console.info("Investor sample row:", {
      id: sample.id,
      accountNumber: sample.accountNumber,
      status: "active",
      hasEndDate: Boolean(sample.endDate),
      isRollover: Boolean(sample.isRollover),
      adminFeeApplied: sample.adminFeeApplied,
      rolloverSequence: sample.rolloverSequence,
    });
  }

  if (results.length === 0) {
    return null;
  }

  // Find parent accounts that have rollover children (within this result set)
  const parentAccountIds = new Set(
    results
      .filter((r) => r.parentAccountId)
      .map((r) => r.parentAccountId)
  );

  // We process ALL accounts so the table shows the full chain (Fund 1, 1R, 1RR, ...).
  // Totals are computed selectively below:
  //   - Capital: only root accounts (is_rollover = false) — actual money invested
  //   - Present value: only leaf accounts (not parent of any other) — no double-count of chain
  const investments: InvestmentDetail[] = [];
  let totalNetInvestedFund = 0;
  let totalGrossInvestedFund = 0;
  let totalAdminFees = 0;
  let totalNetPresentValue = 0;

  // Batch-fetch all redemptions in a single query
  const accountIds = results.map((r) => r.id);
  const redemptionMap = await getBatchRedemptions(accountIds);

  const investmentPromises = results.map(
    async (result, index: number) => {
      const grossCapital = Number(result.grossCapital);
      const annualRate = Number(result.annualRate);
      const isRollover = result.isRollover || false;
      const adminFeeApplied = result.adminFeeApplied !== false; // Default to true if null
      const adminFeeRate = Number(result.adminFeeRate || 0);

      const adminFee = grossCapital * adminFeeRate;
      const netCapital = grossCapital - adminFee;

      // Calculate Net Present Value using redemption-aware utility
      const now = new Date();
      const calcEnd = result.endDate && result.endDate < now ? result.endDate : now;
      const npvResult = await calculateNetPresentValueWithRedemptions(
        result.id,
        grossCapital,
        annualRate,
        result.startDate,
        calcEnd,
        isRollover,
        adminFeeApplied,
        redemptionMap.get(result.id),
        adminFeeRate
      );

      const gainLoss = npvResult.currentValue - netCapital;
      const gainLossPercentage =
        netCapital > 0 ? (gainLoss / netCapital) * 100 : 0;

      // Return investment data for accumulation
      return {
        id: result.id,
        grossCapital,
        netCapital,
        adminFee,
        npvCurrentValue: npvResult.currentValue,
        investmentDetail: {
          accountNumber: result.accountNumber,
          netInvestedAmount: netCapital,
          grossInvestedAmount: grossCapital,
          adminFee,
          startDate: result.startDate,
          endDate: result.endDate,
          annualRate,
          isRollover,
          rolloverSequence: result.rolloverSequence || 0,
          currentValue: npvResult.currentValue,
          gainLoss,
          gainLossPercentage,
          daysInvested: npvResult.daysInvested,
        },
      };
    }
  );

  // Wait for all investments to be processed
  const processedInvestments = await Promise.all(investmentPromises);

  // Accumulate totals
  processedInvestments.forEach((processed) => {
    const isRollover = processed.investmentDetail.isRollover;
    const isLeaf = !parentAccountIds.has(processed.id);

    // Capital totals: only count original (root) investments — rollovers are recompounded gains
    if (!isRollover) {
      totalGrossInvestedFund += processed.grossCapital;
      totalNetInvestedFund += processed.netCapital;
      totalAdminFees += processed.adminFee;
    }

    // Present value: only count leaves so chain values aren't double-counted
    if (isLeaf) {
      totalNetPresentValue += processed.npvCurrentValue;
    }

    investments.push(processed.investmentDetail);
  });

  // Calculate total portfolio gain/loss
  const totalGainLoss = totalNetPresentValue - totalNetInvestedFund;
  const totalGainLossPercentage =
    totalNetInvestedFund > 0 ? (totalGainLoss / totalNetInvestedFund) * 100 : 0;

  const finalSummary = {
    email: investorEmail,
    totalNetInvestedFund,
    totalGrossInvestedFund,
    totalAdminFees,
    totalNetPresentValue,
    totalGainLoss,
    totalGainLossPercentage,
    activeInvestments: investments.length,
    investments,
  };

  return finalSummary;
}

// Helper function to get all investors (for admin use)
export async function getAllInvestorEmails(): Promise<string[]> {
  const db = createDrizzleConnection();

  const results = await db
    .selectDistinct({
      email: authUsers.email,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .innerJoin(accounts, eq(profiles.id, accounts.user_id))
    .where(eq(accounts.status, "active"));

  return results
    .map((result) => result.email)
    .filter((email): email is string => email !== null);
}
