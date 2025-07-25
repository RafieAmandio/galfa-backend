"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, and, not, exists, gt } from "drizzle-orm";
import { calculateFloatingRateValueWithRedemptions } from "@/lib/utils/floating-rate-calculator-with-redemptions";
import { checkAdminAccess } from "@/lib/auth/admin-check";

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

export async function getFloatingRateAccountsForRedemption(
  redemptionDate: Date
): Promise<FloatingRateAccountForRedemption[]> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

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
        eq(accounts.status, "active"),
        // Only include accounts where redemption date is before or on end date (if end date exists)
        accounts.end_date ? gt(accounts.end_date, redemptionDate) : undefined,
        // Exclude parent accounts that have rollover children (floating rate doesn't have rollovers, but keeping for consistency)
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

  // Calculate current values for each account
  const accountsWithBalances = await Promise.all(
    results.map(async (account) => {
      const grossCapital = Number(account.grossCapital);
      const adminFee = Number(account.adminFee);
      const netInvestorFund = grossCapital - adminFee;

      try {
        // Calculate current value with redemptions up to the redemption date
        const valueResult = await calculateFloatingRateValueWithRedemptions(
          account.id,
          netInvestorFund,
          account.transactionDate,
          redemptionDate
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
}
