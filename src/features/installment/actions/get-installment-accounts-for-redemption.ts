"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, installmentAccounts, authUsers } from "@/db/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { checkAdminAccess } from "@/lib/auth/admin-check";
import { calculateInstallmentValueWithRedemptions } from "@/lib/utils/installment-calculator-with-redemptions";

interface InstallmentAccountForRedemption {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  transactionDate: Date;
  endDate: Date;
  isRollover: boolean;
  currentValue: number;
  totalRedemptions: number;
  remainingPrincipal: number;
  monthlyCof: number;
  investmentType: string;
}

/**
 * Get installment accounts available for redemption on a specific date
 */
export async function getInstallmentAccountsForRedemption(
  redemptionDate: Date
): Promise<InstallmentAccountForRedemption[]> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  const db = createDrizzleConnection();

  // Get all active installment accounts
  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      grossCapital: accounts.capital,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      status: accounts.status,
      isRollover: accounts.is_rollover,
      userId: accounts.user_id,
      adminFee: installmentAccounts.admin_fee,
      monthlyCof: installmentAccounts.monthly_cof,
      investmentType: installmentAccounts.investment_type,
      investorEmail: authUsers.email,
    })
    .from(accounts)
    .innerJoin(
      installmentAccounts,
      eq(accounts.id, installmentAccounts.account_id)
    )
    .innerJoin(authUsers, eq(accounts.user_id, authUsers.id))
    .where(
      and(
        eq(accounts.status, "active"),
        lte(accounts.transaction_date, redemptionDate) // Account must have started before redemption date
      )
    )
    .orderBy(accounts.transaction_date);

  // Calculate current values and filter accounts with meaningful balances
  const accountsWithValues = await Promise.all(
    results.map(async (result) => {
      const grossCapital = Number(result.grossCapital);
      const adminFee = Number(result.adminFee);
      const netInvestorFund = grossCapital - adminFee;
      const monthlyCof = Number(result.monthlyCof);
      const investmentType = result.investmentType as
        | "principle"
        | "interest_only";

      // Calculate current value with redemptions
      const currentValue = await calculateInstallmentValueWithRedemptions(
        result.id,
        netInvestorFund,
        monthlyCof,
        investmentType,
        result.transactionDate,
        redemptionDate
      );

      return {
        id: result.id,
        accountNumber: result.accountNumber,
        investorEmail: result.investorEmail || "Unknown",
        grossCapital,
        adminFee,
        netInvestorFund,
        transactionDate: result.transactionDate,
        endDate: result.endDate!,
        isRollover: result.isRollover || false,
        currentValue: currentValue.currentValue,
        totalRedemptions: currentValue.totalRedemptions,
        remainingPrincipal: currentValue.remainingPrincipal,
        monthlyCof,
        investmentType,
      };
    })
  );

  // Filter out accounts with very low balances (less than Rp 1,000)
  // and accounts that are past their end date
  const eligibleAccounts = accountsWithValues.filter(
    (account) =>
      account.currentValue >= 1000 && // Must have meaningful balance
      account.endDate >= redemptionDate // Must not be past end date
  );

  return eligibleAccounts;
}
