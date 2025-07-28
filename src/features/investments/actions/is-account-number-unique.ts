"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Check if account number is unique
 */
export async function isAccountNumberUnique(
  accountNumber: string
): Promise<boolean> {
  const db = createDrizzleConnection();

  const existingAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.account_number, accountNumber))
    .limit(1);

  return existingAccount.length === 0;
}
