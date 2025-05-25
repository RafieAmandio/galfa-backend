"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { vcPerformance } from "@/db/drizzle/schema";
import { desc, eq } from "drizzle-orm";

interface VCPerformance {
  date: Date;
  aum: number;
  grossProfit: number;
  roiPercentage: number;
  cofFixRate: number;
}

/**
 * Get the latest VC performance data
 */
export async function getLatestVCPerformance(): Promise<VCPerformance | null> {
  const db = createDrizzleConnection();

  // Get current and previous month's AUM
  const results = await db
    .select({
      date: vcPerformance.date,
      aum: vcPerformance.aum,
      roiPercentage: vcPerformance.roi_percentage,
      cofFixRate: vcPerformance.cof_fix_rate,
    })
    .from(vcPerformance)
    .orderBy(desc(vcPerformance.date))
    .limit(2);

  if (results.length === 0) {
    return null;
  }

  const currentMonth = results[0];
  const previousMonth = results[1];

  // Calculate gross profit as difference between current and previous AUM
  const grossProfit = previousMonth
    ? Number(currentMonth.aum) - Number(previousMonth.aum)
    : 0;

  return {
    date: currentMonth.date,
    aum: Number(currentMonth.aum),
    grossProfit,
    roiPercentage: Number(currentMonth.roiPercentage),
    cofFixRate: Number(currentMonth.cofFixRate),
  };
}

/**
 * Get VC performance data for a specific month
 */
export async function getVCPerformanceByDate(
  date: Date
): Promise<VCPerformance | null> {
  const db = createDrizzleConnection();

  // Set date to first day of the month
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  // Get current and previous month's AUM
  const results = await db
    .select({
      date: vcPerformance.date,
      aum: vcPerformance.aum,
      roiPercentage: vcPerformance.roi_percentage,
      cofFixRate: vcPerformance.cof_fix_rate,
    })
    .from(vcPerformance)
    .where(eq(vcPerformance.date, firstDayOfMonth));

  if (results.length === 0) {
    return null;
  }

  // Get previous month's AUM
  const previousMonth = await db
    .select({
      aum: vcPerformance.aum,
    })
    .from(vcPerformance)
    .where(
      eq(
        vcPerformance.date,
        new Date(date.getFullYear(), date.getMonth() - 1, 1)
      )
    )
    .limit(1);

  // Calculate gross profit as difference between current and previous AUM
  const grossProfit =
    previousMonth.length > 0
      ? Number(results[0].aum) - Number(previousMonth[0].aum)
      : 0;

  return {
    date: results[0].date,
    aum: Number(results[0].aum),
    grossProfit,
    roiPercentage: Number(results[0].roiPercentage),
    cofFixRate: Number(results[0].cofFixRate),
  };
}
