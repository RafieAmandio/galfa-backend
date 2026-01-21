"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  capitalMarketAccounts,
  capitalMarketPerformance,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const getCapitalMarketPerformanceByUserId = cache(async function (
  userId: string
) {
  const db = createDrizzleConnection();

  const capitalMarketAccount = await db
    .select()
    .from(capitalMarketAccounts)
    .where(eq(capitalMarketAccounts.user_id, userId));

  // Return empty array if user has no capital market account
  if (capitalMarketAccount.length === 0) {
    return [];
  }

  const capitalMarketPerformanceResponse = await db
    .select()
    .from(capitalMarketPerformance)
    .where(
      eq(
        capitalMarketPerformance.capital_market_account_id,
        capitalMarketAccount[0].id
      )
    );

  return capitalMarketPerformanceResponse;
});
