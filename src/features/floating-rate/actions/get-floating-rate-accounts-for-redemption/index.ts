"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, or, and, not, exists } from "drizzle-orm";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { getBatchFloatingRateGrowthPercentages } from "../get-floating-rate-growth-percentage/index";
import { cache } from "react";

interface FloatingRateAccountForRedemption {
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
}

export const getFloatingRateAccountsForRedemption = cache(async function (
  redemptionDate: Date
): Promise<FloatingRateAccountForRedemption[]> {
  const db = createDrizzleConnection();

  // Get all accounts that are eligible for redemption
  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      investorEmail: authUsers.email,
      grossCapital: accounts.capital,
      transactionDate: accounts.transaction_date,
      endDate: accounts.end_date,
      isRollover: accounts.is_rollover,
      adminFee: floatingRateAccounts.admin_fee,
    })
    .from(accounts)
    .innerJoin(
      floatingRateAccounts,
      eq(accounts.id, floatingRateAccounts.account_id)
    )
    .innerJoin(profiles, eq(accounts.user_id, profiles.id))
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .where(
      and(
        or(eq(accounts.status, "active"), eq(accounts.status, "mature")),
        not(
          exists(
            db
              .select()
              .from(accounts)
              .where(eq(accounts.parent_account_id, accounts.id))
          )
        )
      )
    );

  // Batch-fetch all redemptions and growth rates in parallel
  const accountIds = results.map((r) => r.id);
  const earliestDate = results.reduce((earliest, r) => {
    return r.transactionDate < earliest ? r.transactionDate : earliest;
  }, results[0]?.transactionDate || new Date());
  const [redemptionMap, growthRatesMap] = await Promise.all([
    getBatchRedemptions(accountIds),
    getBatchFloatingRateGrowthPercentages(earliestDate, redemptionDate),
  ]);

  // Calculate current values for each account with pre-fetched data
  const accountsWithBalances = await Promise.all(
    results.map(async (account) => {
      const grossCapital = Number(account.grossCapital);
      const adminFee = Number(account.adminFee);
      const netInvestorFund = grossCapital - adminFee;

      try {
        // Calculate current value with pre-fetched redemptions and growth rates
        const valueResult = await calculateFloatingRateValueWithRedemptions(
          account.id,
          netInvestorFund,
          account.transactionDate,
          redemptionDate,
          redemptionMap.get(account.id),
          growthRatesMap,
          account.endDate
        );

        // Only return accounts with positive balance
        if (valueResult.currentValue <= 1000) {
          return null; // Filter out accounts with minimal balance
        }

        return {
          id: account.id,
          accountNumber: account.accountNumber,
          investorEmail: account.investorEmail || "N/A",
          grossCapital,
          adminFee,
          netInvestorFund,
          transactionDate: account.transactionDate,
          endDate: account.endDate!,
          isRollover: account.isRollover || false,
          currentValue: valueResult.currentValue,
          totalRedemptions: valueResult.totalRedemptions,
          remainingPrincipal: valueResult.remainingPrincipal,
        };
      } catch (error) {
        console.error(
          `Error calculating value for account ${account.id}:`,
          error
        );
        return null; // Skip accounts with calculation errors
      }
    })
  );

  // Filter out null values and return
  return accountsWithBalances.filter(
    (account): account is FloatingRateAccountForRedemption => account !== null
  );
});
