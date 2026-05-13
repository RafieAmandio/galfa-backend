"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
  mutations,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

type AccountType = "flat-rate" | "floating-rate" | "installment";

interface BulkDeleteResult {
  success: boolean;
  totalDeleted: number;
  totalFailed: number;
  results: Array<{
    accountId: number;
    accountNumber: string;
    success: boolean;
    message: string;
  }>;
}

const typeConfig: Record<
  AccountType,
  { table: typeof fixRateAccounts | typeof floatingRateAccounts | typeof installmentAccounts }
> = {
  "flat-rate": { table: fixRateAccounts },
  "floating-rate": { table: floatingRateAccounts },
  "installment": { table: installmentAccounts },
};

export async function bulkDeleteAccounts(
  accountIds: number[],
  accountType: AccountType
): Promise<BulkDeleteResult> {
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      totalDeleted: 0,
      totalFailed: 0,
      results: [
        {
          accountId: 0,
          accountNumber: "",
          success: false,
          message: "Unauthorized: Admin access required",
        },
      ],
    };
  }

  if (!accountIds.length) {
    return {
      success: false,
      totalDeleted: 0,
      totalFailed: 0,
      results: [],
    };
  }

  const db = createDrizzleConnection();
  const config = typeConfig[accountType];
  const results: BulkDeleteResult["results"] = [];

  for (const accountId of accountIds) {
    try {
      const existing = await db
        .select({
          id: accounts.id,
          accountNumber: accounts.account_number,
        })
        .from(accounts)
        .innerJoin(config.table, eq(accounts.id, (config.table as any).account_id))
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (existing.length === 0) {
        results.push({
          accountId,
          accountNumber: "",
          success: false,
          message: `Account not found or not a ${accountType} account`,
        });
        continue;
      }

      const accountNumber = existing[0].accountNumber;

      await db.delete(mutations).where(eq(mutations.account_id, accountId));
      await db.delete(config.table).where(eq((config.table as any).account_id, accountId));
      await db.delete(accounts).where(eq(accounts.id, accountId));

      results.push({
        accountId,
        accountNumber,
        success: true,
        message: `Account ${accountNumber} deleted`,
      });
    } catch (error) {
      results.push({
        accountId,
        accountNumber: "",
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const totalDeleted = results.filter((r) => r.success).length;
  const totalFailed = results.filter((r) => !r.success).length;

  return {
    success: totalFailed === 0,
    totalDeleted,
    totalFailed,
    results,
  };
}
