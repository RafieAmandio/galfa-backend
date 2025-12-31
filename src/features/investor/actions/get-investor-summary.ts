"use server";

import { createDrizzleConnection, getDbConnectionDebug } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/constants";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";

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

  // Find parent accounts that have rollover children
  const parentAccountIds = new Set(
    results
      .filter((r) => r.isRollover && r.parentAccountId)
      .map((r) => r.parentAccountId)
  );

  // Separate parent accounts from active accounts
  const parentAccounts = results.filter((result) =>
    parentAccountIds.has(result.id)
  );
  const activeAccounts = results.filter((result) => {
    const isParentWithRollover = parentAccountIds.has(result.id);
    if (isParentWithRollover) {
      return false;
    }
    return true;
  });

  const investments: InvestmentDetail[] = [];
  let totalNetInvestedFund = 0;
  let totalGrossInvestedFund = 0;
  let totalAdminFees = 0;
  let totalNetPresentValue = 0;

  // First, calculate admin fees from parent accounts (not included in active investments)
  parentAccounts.forEach((result) => {
    const grossCapital = Number(result.grossCapital);
    const adminFeeApplied = result.adminFeeApplied !== false; // Default to true if null

    if (adminFeeApplied) {
      const adminFee = grossCapital * ADMIN_FEE_PERCENTAGE;
      totalAdminFees += adminFee;
    }
  });

  const investmentPromises = activeAccounts.map(
    async (result, index: number) => {
      const grossCapital = Number(result.grossCapital);
      const annualRate = Number(result.annualRate);
      const isRollover = result.isRollover || false;
      const adminFeeApplied = result.adminFeeApplied !== false; // Default to true if null

      // Calculate admin fee and net capital based on account type
      let adminFee: number;
      let netCapital: number;

      if (isRollover && !adminFeeApplied) {
        // Rollover account: no additional admin fee, use full capital
        adminFee = 0;
        netCapital = grossCapital;
      } else {
        // Regular account: apply admin fee
        adminFee = grossCapital * ADMIN_FEE_PERCENTAGE;
        netCapital = grossCapital - adminFee;
      }

      // Calculate Net Present Value using redemption-aware utility
      const npvResult = await calculateNetPresentValueWithRedemptions(
        result.id,
        grossCapital,
        annualRate,
        result.startDate,
        new Date(),
        isRollover,
        adminFeeApplied
      );

      const gainLoss = npvResult.currentValue - netCapital;
      const gainLossPercentage =
        netCapital > 0 ? (gainLoss / netCapital) * 100 : 0;

      // Return investment data for accumulation
      return {
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
  processedInvestments.forEach((processed, index) => {
    totalGrossInvestedFund += processed.grossCapital;
    totalNetInvestedFund += processed.netCapital;
    totalAdminFees += processed.adminFee;
    totalNetPresentValue += processed.npvCurrentValue;

    // Add investment detail
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
