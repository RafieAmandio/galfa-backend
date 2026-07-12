"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq, and, not, exists } from "drizzle-orm";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";
import { getBatchRedemptions } from "@/lib/utils/batch-redemptions";
import { checkAdminAccess } from "@/lib/auth/admin-check";

interface AccountForRedemption {
  id: number;
  accountNumber: string;
  grossCapital: number;
  netCapital: number;
  annualRate: number;
  startDate: Date;
  endDate: Date;
  isRollover: boolean;
  adminFeeApplied: boolean;
  currentValue: number;
  totalRedemptions: number;
  remainingPrincipal: number;
}

export async function getAccountsForRedemptionWithBalance(
  redemptionDate: Date
): Promise<AccountForRedemption[]> {
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
      grossCapital: accounts.capital,
      annualRate: fixRateAccounts.annual_rate,
      adminFeeRate: fixRateAccounts.admin_fee,
      startDate: accounts.transaction_date,
      endDate: accounts.end_date,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(
      and(
        eq(accounts.status, "active"),
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

  // Batch-fetch all redemptions in a single query
  const accountIds = results.map((r) => r.id);
  const redemptionMap = await getBatchRedemptions(accountIds);

  // Calculate current values for each account with pre-fetched redemptions
  const accountsWithBalances = await Promise.all(
    results.map(async (account) => {
      const grossCapital = Number(account.grossCapital);
      const annualRate = Number(account.annualRate);
      const isRollover = account.isRollover || false;
      const adminFeeApplied = account.adminFeeApplied !== false;
      const adminFeeRate = Number(account.adminFeeRate || 0);

      // Calculate NPV with pre-fetched redemptions up to the redemption date
      const npvResult = await calculateNetPresentValueWithRedemptions(
        account.id,
        grossCapital,
        annualRate,
        account.startDate,
        redemptionDate,
        isRollover,
        adminFeeApplied,
        redemptionMap.get(account.id),
        adminFeeRate
      );

      // Only return accounts with positive balance
      if (npvResult.currentValue <= 1000) {
        return null; // Filter out accounts with minimal balance
      }

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        grossCapital,
        netCapital: npvResult.remainingPrincipal,
        annualRate,
        startDate: account.startDate,
        endDate: account.endDate!,
        isRollover,
        adminFeeApplied,
        currentValue: npvResult.currentValue,
        totalRedemptions: npvResult.totalRedemptions,
        remainingPrincipal: npvResult.remainingPrincipal,
      };
    })
  );

  // Filter out null values and return
  return accountsWithBalances.filter(
    (account): account is AccountForRedemption => account !== null
  );
}
