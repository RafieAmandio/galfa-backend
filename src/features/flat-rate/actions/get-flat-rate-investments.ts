"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts } from "@/db/drizzle/schema";
import { eq } from "drizzle-orm";
import { getMonthlyCompoundRate } from "@/lib/utils/rate-calculations";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";
import { calculateNetPresentValueWithRedemptions } from "@/lib/utils/npv-calculator-with-redemptions";

interface MonthlyData {
  monthYear: string;
  daysInPeriod: number;
  effectiveRate: number; // Rate for this specific period
  beginningBalance: number;
  monthlyInterest: number;
  endingBalance: number;
  redemptions?: number; // Add redemptions tracking
}

interface FlatRateInvestment {
  id: number; // Add account ID
  name: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  rate: number;
  transDate: Date;
  endDate: Date;
  status: string;
  annualizedCoF: number;
  currentValue: number; // NPV with redemptions
  totalRedemptions: number; // Total amount redeemed
  remainingPrincipal: number; // Principal after redemptions
  monthlyData: MonthlyData[];
}

export async function getFlatRateInvestments(): Promise<FlatRateInvestment[]> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      id: accounts.id, // Add account ID
      name: accounts.account_number,
      grossCapital: accounts.capital, // Full capital from database
      rate: fixRateAccounts.annual_rate,
      transDate: accounts.transaction_date,
      endDate: accounts.end_date,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      rolloverSequence: accounts.rollover_sequence,
      status: accounts.status,
    })
    .from(accounts)
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id));

  // Process each result and calculate NPV with redemptions
  const investments = await Promise.all(
    results.map(async (result) => {
      const grossCapital = Number(result.grossCapital);
      const annualRate = Number(result.rate);
      const isRollover = result.isRollover || false;
      const adminFeeApplied = result.adminFeeApplied !== false; // Default to true if null

      // Calculate admin fee and net capital based on account type
      let adminFee: number;
      let netCapital: number;

      if (isRollover && !adminFeeApplied) {
        // Rollover account: no additional admin fee, use full capital
        adminFee = 0;
        netCapital = grossCapital;
      } else {
        // Regular account: apply admin fee
        adminFee = grossCapital * ADMIN_FEE_PERCENTAGE;
        netCapital = grossCapital - adminFee;
      }

      // Calculate NPV with redemptions
      const npvWithRedemptions = await calculateNetPresentValueWithRedemptions(
        result.id,
        grossCapital,
        annualRate,
        result.transDate,
        new Date(),
        isRollover,
        adminFeeApplied
      );

      return {
        id: result.id,
        name: result.name,
        grossCapital,
        adminFee,
        netCapital,
        rate: Number((annualRate * 100).toFixed(2)),
        transDate: result.transDate,
        endDate: result.endDate!,
        status: result.status,
        annualizedCoF: netCapital * annualRate, // CoF calculated on net capital
        currentValue: npvWithRedemptions.currentValue,
        totalRedemptions: npvWithRedemptions.totalRedemptions,
        remainingPrincipal: npvWithRedemptions.remainingPrincipal,
        monthlyData: npvWithRedemptions.monthlyBreakdown.map((month) => ({
          monthYear: month.monthYear,
          daysInPeriod: month.daysInPeriod,
          effectiveRate: 0, // Will calculate based on interest earned
          beginningBalance: month.startingBalance,
          monthlyInterest: month.interestEarned,
          endingBalance: month.endingBalance,
          redemptions: month.redemptions,
        })),
      };
    })
  );

  return investments;
}

function calculateMonthlyData(params: {
  transDate: Date;
  endDate: Date;
  annualRate: number;
  netCapital: number;
}): MonthlyData[] {
  const monthlyData: MonthlyData[] = [];
  const startDate = new Date(params.transDate);
  const endDate = new Date(params.endDate);
  const monthlyRate = getMonthlyCompoundRate(
    params.netCapital,
    params.annualRate
  );

  console.log("=".repeat(80));
  console.log("INVESTMENT CALCULATION DEBUG");
  console.log("=".repeat(80));
  console.log("Input Parameters:");
  console.log("- Start Date:", startDate.toISOString().split("T")[0]);
  console.log("- End Date:", endDate.toISOString().split("T")[0]);
  console.log("- Annual Rate:", (params.annualRate * 100).toFixed(4) + "%");
  console.log(
    "- Net Capital:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(params.netCapital)
  );
  console.log("- Monthly Rate:", (monthlyRate * 100).toFixed(6) + "%");
  console.log("");

  let currentBalance = params.netCapital;
  let currentDate = new Date(startDate);
  let monthCounter = 0;

  while (currentDate <= endDate) {
    monthCounter++;
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ); // Last day of current month
    const actualEndDate = monthEnd > endDate ? endDate : monthEnd;

    // Calculate days in this period
    let daysInPeriod = Math.ceil(
      (actualEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Add 1 day only for full months (not for partial start/end months)
    const isStartMonth = currentDate.getTime() === startDate.getTime();
    const isEndMonth = actualEndDate.getTime() === endDate.getTime();

    if (!isStartMonth && !isEndMonth) {
      daysInPeriod += 1;
    }

    const beginningBalance = currentBalance;

    // Calculate effective rate based on whether it's a full month or partial month
    let effectiveRate: number;
    let periodInterest: number;

    if (isStartMonth || isEndMonth) {
      const actualMonthDays = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      effectiveRate = (daysInPeriod / actualMonthDays) * monthlyRate;
      periodInterest = beginningBalance * effectiveRate;
    } else {
      // Full month: always use the full monthly rate regardless of calendar days
      effectiveRate = monthlyRate;
      periodInterest = beginningBalance * effectiveRate;
    }

    const endingBalance = beginningBalance + periodInterest;

    const monthKey = currentDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    console.log(`Month ${monthCounter}: ${monthKey}`);
    console.log("- Period Start:", currentDate.toISOString().split("T")[0]);
    console.log("- Period End:", actualEndDate.toISOString().split("T")[0]);
    console.log("- Days in Period:", daysInPeriod);
    console.log("- Is Partial Month:", isStartMonth || isEndMonth);
    console.log(
      "- Beginning Balance:",
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(beginningBalance)
    );
    console.log(
      "- Effective Rate for Period:",
      (effectiveRate * 100).toFixed(6) + "%"
    );
    if (isStartMonth || isEndMonth) {
      console.log(
        "- Rate Calculation: (" +
          daysInPeriod +
          "/30) * " +
          (monthlyRate * 100).toFixed(6) +
          "% = " +
          (effectiveRate * 100).toFixed(6) +
          "%"
      );
    } else {
      console.log(
        "- Rate Calculation: Full monthly rate = " +
          (effectiveRate * 100).toFixed(6) +
          "%"
      );
    }
    console.log(
      "- Interest Calculation:",
      beginningBalance.toFixed(2),
      "* " + (effectiveRate * 100).toFixed(6) + "% = ",
      periodInterest.toFixed(2)
    );
    console.log(
      "- Interest Earned:",
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(periodInterest)
    );
    console.log(
      "- Ending Balance:",
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(endingBalance)
    );
    console.log("");

    monthlyData.push({
      monthYear: monthKey,
      daysInPeriod,
      effectiveRate, // Consistent rate for full months, proportional for partial
      beginningBalance,
      monthlyInterest: periodInterest,
      endingBalance,
    });

    // Update for next iteration
    currentBalance = endingBalance;
    // Move to first day of next month
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
  }

  console.log("=".repeat(80));
  console.log("CALCULATION SUMMARY");
  console.log("=".repeat(80));
  console.log(
    "- Initial Investment:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(params.netCapital)
  );
  console.log(
    "- Final Balance:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(currentBalance)
  );
  console.log(
    "- Total Interest Earned:",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(currentBalance - params.netCapital)
  );
  console.log(
    "- Total Return Percentage:",
    ((currentBalance / params.netCapital - 1) * 100).toFixed(4) + "%"
  );
  console.log("- Total Months:", monthCounter);
  console.log("=".repeat(80));

  return monthlyData;
}
