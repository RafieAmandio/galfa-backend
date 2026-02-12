import { createDrizzleConnection } from "@/db/drizzle/connection";
import { mutations } from "@/db/drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface Redemption {
  amount: number;
  transactionDate: Date;
  status: string;
}

/**
 * Fetch redemptions for all given account IDs in a single query.
 * Returns a Map keyed by account ID with an array of Redemptions per account.
 */
export async function getBatchRedemptions(
  accountIds: number[]
): Promise<Map<number, Redemption[]>> {
  if (accountIds.length === 0) {
    return new Map();
  }

  const db = createDrizzleConnection();

  const results = await db
    .select({
      accountId: mutations.account_id,
      amount: mutations.amount,
      transactionDate: mutations.transaction_date,
      status: mutations.status,
    })
    .from(mutations)
    .where(
      and(
        inArray(mutations.account_id, accountIds),
        eq(mutations.type, "redemption"),
        eq(mutations.status, "completed")
      )
    )
    .orderBy(mutations.transaction_date);

  const redemptionMap = new Map<number, Redemption[]>();

  // Initialize empty arrays for all requested IDs
  for (const id of accountIds) {
    redemptionMap.set(id, []);
  }

  // Group results by account ID
  for (const result of results) {
    const accountId = result.accountId!;
    const arr = redemptionMap.get(accountId)!;
    arr.push({
      amount: Number(result.amount),
      transactionDate: result.transactionDate,
      status: result.status,
    });
  }

  return redemptionMap;
}
