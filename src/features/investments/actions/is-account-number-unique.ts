"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  fixRateAccounts,
  floatingRateAccounts,
  installmentAccounts,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

export async function isAccountNumberUnique(
  accountNumber: string
): Promise<boolean> {
  const db = createDrizzleConnection();

  const existing = await db
    .select({
      id: accounts.id,
      hasFixRate: fixRateAccounts.id,
      hasFloatingRate: floatingRateAccounts.id,
      hasInstallment: installmentAccounts.id,
    })
    .from(accounts)
    .leftJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .leftJoin(floatingRateAccounts, eq(accounts.id, floatingRateAccounts.account_id))
    .leftJoin(installmentAccounts, eq(accounts.id, installmentAccounts.account_id))
    .where(eq(accounts.account_number, accountNumber))
    .limit(1);

  if (existing.length === 0) return true;

  const row = existing[0];
  if (row.hasFixRate || row.hasFloatingRate || row.hasInstallment) {
    return false;
  }

  // Orphaned entry — clean it up
  await db.delete(accounts).where(eq(accounts.id, row.id));
  return true;
}
