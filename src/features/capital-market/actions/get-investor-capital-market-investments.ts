"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  capitalMarketAccounts,
  capitalMarketPerformance,
  profiles,
  authUsers,
} from "@/db/drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface CapitalMarketInvestmentData {
  performanceDate: Date;
  totalInvested: number;
  grossPerformance: number;
  netPerformance: number;
}

export interface CapitalMarketSummary {
  hasData: boolean;
  investments: CapitalMarketInvestmentData[];
  latestTotalInvested: number;
  latestGrossPerformance: number;
  latestNetPerformance: number;
}

export async function getInvestorCapitalMarketInvestments(
  investorEmail: string
): Promise<CapitalMarketSummary> {
  const db = createDrizzleConnection();

  // First, get the user ID from email
  const userResult = await db
    .select({
      userId: profiles.id,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .where(eq(authUsers.email, investorEmail))
    .limit(1);

  if (userResult.length === 0) {
    return {
      hasData: false,
      investments: [],
      latestTotalInvested: 0,
      latestGrossPerformance: 0,
      latestNetPerformance: 0,
    };
  }

  const userId = userResult[0].userId;

  // Get the capital market account for this user
  const capitalMarketAccount = await db
    .select()
    .from(capitalMarketAccounts)
    .where(eq(capitalMarketAccounts.user_id, userId));

  if (capitalMarketAccount.length === 0) {
    return {
      hasData: false,
      investments: [],
      latestTotalInvested: 0,
      latestGrossPerformance: 0,
      latestNetPerformance: 0,
    };
  }

  // Get all performance records
  const performanceRecords = await db
    .select()
    .from(capitalMarketPerformance)
    .where(
      eq(
        capitalMarketPerformance.capital_market_account_id,
        capitalMarketAccount[0].id
      )
    )
    .orderBy(desc(capitalMarketPerformance.performance_date));

  if (performanceRecords.length === 0) {
    return {
      hasData: false,
      investments: [],
      latestTotalInvested: 0,
      latestGrossPerformance: 0,
      latestNetPerformance: 0,
    };
  }

  const investments: CapitalMarketInvestmentData[] = performanceRecords.map(
    (record) => ({
      performanceDate: record.performance_date,
      totalInvested: Number(record.total_invested),
      grossPerformance: Number(record.gross_performance),
      netPerformance: Number(record.net_performance),
    })
  );

  // Get the latest record for summary
  const latestRecord = performanceRecords[0];

  return {
    hasData: true,
    investments,
    latestTotalInvested: Number(latestRecord.total_invested),
    latestGrossPerformance: Number(latestRecord.gross_performance),
    latestNetPerformance: Number(latestRecord.net_performance),
  };
}
