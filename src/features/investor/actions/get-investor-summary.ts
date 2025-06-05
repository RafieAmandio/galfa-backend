"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, fixRateAccounts, users } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";
import { getMonthlyCompoundRate } from "@/lib/utils/rate-calculations";

interface InvestorSummary {
  email: string;
  totalNetInvestedFund: number; // Total amount working for the investor (after admin fees)
  totalGrossInvestedFund: number; // Total gross investment amount
  totalAdminFees: number; // Total admin fees paid
  totalNetPresentValue: number; // Current value including compound interest
  totalGainLoss: number; // Total gain or loss (NPV - Net Invested)
  totalGainLossPercentage: number; // Percentage gain or loss
  activeInvestments: number; // Number of active investments
  investments: InvestmentDetail[];
}

interface InvestmentDetail {
  accountNumber: string;
  netInvestedAmount: number; // Amount working for investor
  grossInvestedAmount: number; // Original investment amount
  adminFee: number; // Admin fee paid
  startDate: Date;
  endDate: Date | null;
  annualRate: number;
  isRollover: boolean;
  rolloverSequence: number;
  currentValue: number; // Net Present Value including compound interest
  gainLoss: number; // Current gain or loss
  gainLossPercentage: number; // Percentage gain or loss
  daysInvested: number; // Total days the investment has been active
}

// Helper function to calculate NPV for an investment
function calculateNetPresentValue(
  netCapital: number,
  annualRate: number,
  startDate: Date,
  currentDate: Date = new Date()
): { currentValue: number; daysInvested: number } {
  const monthlyRate = getMonthlyCompoundRate(netCapital, annualRate);

  console.log("  🧮 NPV Calculation:");
  console.log("    - Net capital:", netCapital.toLocaleString());
  console.log("    - Annual rate:", (annualRate * 100).toFixed(4) + "%");
  console.log("    - Monthly rate:", (monthlyRate * 100).toFixed(6) + "%");
  console.log("    - Start date:", startDate.toISOString().split("T")[0]);
  console.log("    - Current date:", currentDate.toISOString().split("T")[0]);

  let currentValue = netCapital;
  let calculationDate = new Date(startDate);
  const endDate = currentDate;
  let monthCounter = 0;

  // Calculate total days invested
  const daysInvested = Math.ceil(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  console.log("    - Days invested:", daysInvested);

  while (calculationDate <= endDate) {
    monthCounter++;
    const monthStart = new Date(calculationDate);
    const monthEnd = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      0
    ); // Last day of current month
    const actualEndDate = monthEnd > endDate ? endDate : monthEnd;

    // Calculate days in this period
    let daysInPeriod = Math.ceil(
      (actualEndDate.getTime() - calculationDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Add 1 day only for full months (not for partial start/end months)
    const isStartMonth = calculationDate.getTime() === startDate.getTime();
    const isEndMonth = actualEndDate.getTime() === endDate.getTime();

    if (!isStartMonth && !isEndMonth) {
      daysInPeriod += 1;
    }

    // Calculate effective rate based on whether it's a full month or partial month
    let effectiveRate: number;

    if (isStartMonth || isEndMonth) {
      // Partial month: proportional rate based on days
      const actualMonthDays = new Date(
        calculationDate.getFullYear(),
        calculationDate.getMonth() + 1,
        0
      ).getDate();
      effectiveRate = (daysInPeriod / actualMonthDays) * monthlyRate;
    } else {
      // Full month: always use the full monthly rate regardless of calendar days
      effectiveRate = monthlyRate;
    }

    const periodInterest = currentValue * effectiveRate;
    currentValue = currentValue + periodInterest;

    console.log(
      `    - Month ${monthCounter}: +${periodInterest.toFixed(
        2
      )} → ${currentValue.toFixed(2)}`
    );

    // Move to first day of next month
    calculationDate = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth() + 1,
      1
    );
  }

  console.log("    - Final current value:", currentValue.toLocaleString());

  return { currentValue, daysInvested };
}

export async function getInvestorSummary(
  investorEmail: string
): Promise<InvestorSummary | null> {
  console.log("=".repeat(80));
  console.log("INVESTOR NET FUND CALCULATION - START");
  console.log("=".repeat(80));
  console.log("Requested investor email:", investorEmail);
  console.log("Admin fee percentage:", ADMIN_FEE_PERCENTAGE);

  const db = createDrizzleConnection();

  // Get all active investments for the investor
  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      grossCapital: accounts.capital,
      startDate: accounts.transaction_date,
      endDate: accounts.end_date,
      annualRate: fixRateAccounts.annual_rate,
      isRollover: accounts.is_rollover,
      adminFeeApplied: accounts.admin_fee_applied,
      rolloverSequence: accounts.rollover_sequence,
      parentAccountId: accounts.parent_account_id,
    })
    .from(accounts)
    .innerJoin(users, eq(accounts.user_id, users.id))
    .innerJoin(fixRateAccounts, eq(accounts.id, fixRateAccounts.account_id))
    .where(and(eq(users.email, investorEmail), eq(accounts.status, "active")));

  console.log("Database query results:", results.length, "accounts found");
  console.log("Raw data from database:", JSON.stringify(results, null, 2));

  if (results.length === 0) {
    console.log("❌ No active investments found for investor:", investorEmail);
    console.log("=".repeat(80));
    return null;
  }

  // Find parent accounts that have rollover children
  const parentAccountIds = new Set(
    results
      .filter((r) => r.isRollover && r.parentAccountId)
      .map((r) => r.parentAccountId)
  );

  console.log("");
  console.log("ROLLOVER ANALYSIS:");
  console.log("-".repeat(50));
  console.log(
    "Parent account IDs with rollovers:",
    Array.from(parentAccountIds)
  );

  // Filter out parent accounts that have been rolled over
  const activeAccounts = results.filter((result) => {
    const isParentWithRollover = parentAccountIds.has(result.id);
    if (isParentWithRollover) {
      console.log(
        `⏭️  Excluding parent account ${result.accountNumber} (has rollover children)`
      );
      return false;
    }
    console.log(
      `✅ Including account ${result.accountNumber} (${
        result.isRollover ? "rollover" : "original"
      })`
    );
    return true;
  });

  console.log("");
  console.log("ACTIVE ACCOUNTS AFTER ROLLOVER FILTERING:");
  console.log("-".repeat(50));
  console.log("Total accounts after filtering:", activeAccounts.length);
  activeAccounts.forEach((acc) => {
    console.log(
      `  - ${acc.accountNumber} (${
        acc.isRollover ? "Rollover #" + acc.rolloverSequence : "Original"
      })`
    );
  });

  const investments: InvestmentDetail[] = [];
  let totalNetInvestedFund = 0;
  let totalGrossInvestedFund = 0;
  let totalAdminFees = 0;
  let totalNetPresentValue = 0;

  console.log("");
  console.log("PROCESSING EACH ACTIVE INVESTMENT:");
  console.log("-".repeat(50));

  activeAccounts.forEach((result, index: number) => {
    console.log(`\nInvestment ${index + 1}: ${result.accountNumber}`);
    console.log("  Raw gross capital:", result.grossCapital);
    console.log("  Is rollover:", result.isRollover);
    console.log("  Admin fee applied:", result.adminFeeApplied);
    console.log("  Rollover sequence:", result.rolloverSequence);
    console.log("  Parent account ID:", result.parentAccountId);

    const grossCapital = Number(result.grossCapital);
    const annualRate = Number(result.annualRate);
    const isRollover = result.isRollover || false;
    const adminFeeApplied = result.adminFeeApplied !== false; // Default to true if null

    console.log("  Processed values:");
    console.log("    - Gross capital (number):", grossCapital);
    console.log("    - Annual rate:", annualRate);
    console.log("    - Is rollover (boolean):", isRollover);
    console.log("    - Admin fee applied (boolean):", adminFeeApplied);

    // Calculate admin fee and net capital based on account type
    let adminFee: number;
    let netCapital: number;

    if (isRollover && !adminFeeApplied) {
      // Rollover account: no additional admin fee, use full capital
      adminFee = 0;
      netCapital = grossCapital;
      console.log("  💰 ROLLOVER CALCULATION (NO ADMIN FEE):");
      console.log("    - Admin fee: 0");
      console.log("    - Net capital: ", netCapital);
    } else {
      // Regular account: apply admin fee
      adminFee = grossCapital * ADMIN_FEE_PERCENTAGE;
      netCapital = grossCapital - adminFee;
      console.log("  📊 REGULAR CALCULATION (WITH ADMIN FEE):");
      console.log(
        "    - Admin fee calculation:",
        grossCapital,
        "×",
        ADMIN_FEE_PERCENTAGE,
        "=",
        adminFee
      );
      console.log(
        "    - Net capital calculation:",
        grossCapital,
        "-",
        adminFee,
        "=",
        netCapital
      );
    }

    // Calculate Net Present Value
    const npvResult = calculateNetPresentValue(
      netCapital,
      annualRate,
      result.startDate
    );

    const gainLoss = npvResult.currentValue - netCapital;
    const gainLossPercentage =
      netCapital > 0 ? (gainLoss / netCapital) * 100 : 0;

    console.log("  📈 NPV SUMMARY:");
    console.log("    - Net capital:", netCapital.toLocaleString());
    console.log(
      "    - Current value:",
      npvResult.currentValue.toLocaleString()
    );
    console.log("    - Gain/Loss:", gainLoss.toLocaleString());
    console.log("    - Gain/Loss %:", gainLossPercentage.toFixed(4) + "%");
    console.log("    - Days invested:", npvResult.daysInvested);

    // Add to totals
    totalGrossInvestedFund += grossCapital;
    totalNetInvestedFund += netCapital;
    totalAdminFees += adminFee;
    totalNetPresentValue += npvResult.currentValue;

    console.log("  Running totals after this investment:");
    console.log("    - Total gross fund:", totalGrossInvestedFund);
    console.log("    - Total net fund:", totalNetInvestedFund);
    console.log("    - Total admin fees:", totalAdminFees);
    console.log("    - Total NPV:", totalNetPresentValue);

    // Add investment detail
    investments.push({
      accountNumber: result.accountNumber,
      netInvestedAmount: netCapital,
      grossInvestedAmount: grossCapital,
      adminFee,
      startDate: result.startDate,
      endDate: result.endDate,
      annualRate,
      isRollover,
      rolloverSequence: result.rolloverSequence || 0,
      currentValue: npvResult.currentValue,
      gainLoss,
      gainLossPercentage,
      daysInvested: npvResult.daysInvested,
    });
  });

  // Calculate total portfolio gain/loss
  const totalGainLoss = totalNetPresentValue - totalNetInvestedFund;
  const totalGainLossPercentage =
    totalNetInvestedFund > 0 ? (totalGainLoss / totalNetInvestedFund) * 100 : 0;

  const finalSummary = {
    email: investorEmail,
    totalNetInvestedFund,
    totalGrossInvestedFund,
    totalAdminFees,
    totalNetPresentValue,
    totalGainLoss,
    totalGainLossPercentage,
    activeInvestments: investments.length,
    investments,
  };

  console.log("");
  console.log("=".repeat(80));
  console.log("FINAL INVESTOR SUMMARY (ROLLOVER-FILTERED):");
  console.log("=".repeat(80));
  console.log("Email:", finalSummary.email);
  console.log(
    "Total Net Invested Fund:",
    finalSummary.totalNetInvestedFund.toLocaleString()
  );
  console.log(
    "Total Gross Invested Fund:",
    finalSummary.totalGrossInvestedFund.toLocaleString()
  );
  console.log(
    "Total Admin Fees:",
    finalSummary.totalAdminFees.toLocaleString()
  );
  console.log("💰 PORTFOLIO PERFORMANCE:");
  console.log(
    "Total Net Present Value:",
    finalSummary.totalNetPresentValue.toLocaleString()
  );
  console.log("Total Gain/Loss:", finalSummary.totalGainLoss.toLocaleString());
  console.log(
    "Total Gain/Loss %:",
    finalSummary.totalGainLossPercentage.toFixed(4) + "%"
  );
  console.log(
    "Active Investments (after rollover filtering):",
    finalSummary.activeInvestments
  );
  console.log("");
  console.log("Investment Breakdown:");
  finalSummary.investments.forEach((inv, index) => {
    console.log(`  ${index + 1}. ${inv.accountNumber}:`);
    console.log(`     - Net Amount: ${inv.netInvestedAmount.toLocaleString()}`);
    console.log(`     - Current Value: ${inv.currentValue.toLocaleString()}`);
    console.log(
      `     - Gain/Loss: ${inv.gainLoss.toLocaleString()} (${inv.gainLossPercentage.toFixed(
        2
      )}%)`
    );
    console.log(`     - Days Invested: ${inv.daysInvested}`);
    console.log(
      `     - Gross Amount: ${inv.grossInvestedAmount.toLocaleString()}`
    );
    console.log(`     - Admin Fee: ${inv.adminFee.toLocaleString()}`);
    console.log(
      `     - Type: ${
        inv.isRollover ? "Rollover #" + inv.rolloverSequence : "Original"
      }`
    );
  });
  console.log("");
  console.log(
    "NOTE: Parent accounts with rollovers have been excluded to avoid double counting."
  );
  console.log(
    "NPV calculated using compound interest from investment start date to current date."
  );
  console.log("=".repeat(80));

  return finalSummary;
}

// Helper function to get all investors (for admin use)
export async function getAllInvestorEmails(): Promise<string[]> {
  const db = createDrizzleConnection();

  const results = await db
    .selectDistinct({
      email: users.email,
    })
    .from(users)
    .innerJoin(accounts, eq(users.id, accounts.user_id))
    .where(eq(accounts.status, "active"));

  return results.map((result) => result.email);
}
