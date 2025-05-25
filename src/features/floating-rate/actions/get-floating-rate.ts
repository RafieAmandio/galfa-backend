"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import {
  accounts,
  floatingRateAccounts,
  fixRateAccounts,
} from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";

interface FloatingRateInvestment {
  name: string;
  capital: number;
  transDate: Date;
  endDate: Date;
  hurdleRate: number;
  monthlyRates: {
    [key: string]: number; // Format: "MMM YYYY" (e.g., "Jan 2025")
  };
}

interface FloatingRatePerformance {
  totalCapital: number;
  grossProfitForFloating: number;
  performancePercentage: number;
  floatingRate: number;
}

/**
 * Calculate floating rate based on VC performance
 */
function calculateFloatingRate(
  performancePercentage: number,
  hurdleRate: number
): number {
  const performanceThreshold = 0.24; // 24% threshold from documentation

  if (performancePercentage >= performanceThreshold) {
    // Formula when performance exceeds threshold: hurdle + (performance - hurdle) / 2
    return hurdleRate + (performanceThreshold - hurdleRate) / 2;
  } else {
    // Formula when performance is below threshold: performance / 12
    return performancePercentage / 12;
  }
}

/**
 * Calculate VC performance percentage for floating rate
 */
function calculatePerformancePercentage(
  grossProfitForFloating: number,
  totalFloatingCapital: number
): number {
  return grossProfitForFloating / totalFloatingCapital;
}

/**
 * Calculate gross profit allocated for floating rate accounts
 * This is calculated as: Total Gross Profit - CoF from Fix Rate Accounts
 */
async function calculateGrossProfitForFloating(
  totalGrossProfit: number
): Promise<number> {
  const db = createDrizzleConnection();

  // Get all active fix rate accounts and their CoF
  const fixRateResults = await db
    .select({
      capital: accounts.capital,
      annualRate: fixRateAccounts.annual_rate,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(eq(accounts.status, "active"));

  // Calculate total CoF from fix rate accounts
  const totalCoFFixRate = fixRateResults.reduce(
    (sum, result) => sum + Number(result.capital) * Number(result.annualRate),
    0
  );

  // Gross profit for floating = Total Gross Profit - CoF Fix Rate
  return totalGrossProfit - totalCoFFixRate;
}

/**
 * Get all active floating rate investments with their details
 */
export async function getFloatingRateInvestments(): Promise<
  FloatingRateInvestment[]
> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      name: accounts.account_number,
      capital: accounts.capital,
      transDate: accounts.transaction_date,
      endDate: accounts.end_date,
      hurdleRate: floatingRateAccounts.hurdle_rate,
    })
    .from(accounts)
    .innerJoin(
      floatingRateAccounts,
      eq(accounts.id, floatingRateAccounts.account_id)
    )
    .where(eq(accounts.status, "active"));

  return results.map((result) => ({
    name: result.name,
    capital: Number(result.capital),
    transDate: result.transDate,
    endDate: result.endDate!,
    hurdleRate: Number(result.hurdleRate),
    monthlyRates: {}, // This will be populated by the performance calculation
  }));
}

/**
 * Calculate floating rate performance for all active accounts
 */
export async function getFloatingRatePerformance(
  totalGrossProfit: number
): Promise<FloatingRatePerformance> {
  const db = createDrizzleConnection();

  // Get total capital from all active floating rate accounts
  const results = await db
    .select({
      capital: accounts.capital,
    })
    .from(accounts)
    .innerJoin(
      floatingRateAccounts,
      eq(accounts.id, floatingRateAccounts.account_id)
    )
    .where(eq(accounts.status, "active"));

  const totalCapital = results.reduce(
    (sum, result) => sum + Number(result.capital),
    0
  );

  // Calculate gross profit for floating rate accounts
  const grossProfitForFloating = await calculateGrossProfitForFloating(
    totalGrossProfit
  );

  // Calculate performance percentage
  const performancePercentage = calculatePerformancePercentage(
    grossProfitForFloating,
    totalCapital
  );

  // Calculate floating rate using default hurdle rate of 10%
  const floatingRate = calculateFloatingRate(performancePercentage, 0.1);

  return {
    totalCapital,
    grossProfitForFloating,
    performancePercentage,
    floatingRate,
  };
}
