"use server";

import { createDrizzleConnection } from "@/db/drizzle/connection";
import { accounts, installmentAccounts, profiles } from "@/db/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ADMIN_FEE_PERCENTAGE } from "@/lib/utils/investment-calculator";
import { differenceInMonths, format, addMonths, startOfMonth } from "date-fns";
import { authUsers } from "@/db/drizzle/schema";

interface MonthlyInstallmentData {
  monthYear: string;
  month: number; // 1-based month number
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  netPresentValue: number; // Changed from remainingBalance - balance AFTER payment
  accumulatedInterest: number; // For admin view
}

interface InstallmentInvestment {
  id: number;
  accountNumber: string;
  investorEmail: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  monthlyCof: number;
  durationMonths: number;
  investmentType: "principle" | "interest_only";
  monthlyPrincipalPayment: number | null;
  startDate: Date;
  endDate: Date | null;
  status: string;
  monthlyData: MonthlyInstallmentData[];
  // Admin view specific
  presentValueFund: number;
  totalRedeemedAmount: number;
  netPresentValueFund: number;
  totalGainedFunds: number; // Total interest gained by admin
  // Investor view specific
  totalNetInvestorFund: number; // Running total after redemptions
}

interface AdminInstallmentSummary {
  totalGainedFunds: number; // Total interest from all accounts
  totalPresentValueFund: number;
  totalNetPresentValueFund: number;
  investments: InstallmentInvestment[];
  monthlyGainedFunds: { [monthYear: string]: number }; // Admin gains per month
}

interface InvestorInstallmentSummary {
  investorEmail: string;
  totalNetInvestorFund: number;
  totalRedeemedAmount: number;
  investments: InstallmentInvestment[];
}

/**
 * Calculate monthly installment data for an investment
 * Interest gains start in the month AFTER the transaction date
 */
function calculateInstallmentData(
  netCapital: number,
  monthlyCof: number,
  durationMonths: number,
  investmentType: "principle" | "interest_only",
  startDate: Date
): MonthlyInstallmentData[] {
  const monthlyData: MonthlyInstallmentData[] = [];
  let accumulatedInterest = 0;

  // Calculate monthly principal payment for principle type
  const monthlyPrincipalPayment =
    investmentType === "principle" ? netCapital / durationMonths : 0;

  // Add one extra month to show completion (Net Present Value = 0)
  const totalMonthsToShow = durationMonths + 1;

  for (let month = 1; month <= totalMonthsToShow; month++) {
    // Interest starts in the month AFTER the transaction date
    const currentDate = addMonths(startOfMonth(startDate), month);
    const monthYear = format(currentDate, "MMM yyyy") || `Month ${month}`;

    let principalPayment = 0;
    let interestPayment = 0;
    let totalPayment = 0;
    let netPresentValue = 0; // Balance BEFORE this month's payment

    if (month <= durationMonths) {
      // Regular payment months
      if (investmentType === "principle") {
        // Principle type: interest always calculated on original net capital
        interestPayment = netCapital * monthlyCof;
        principalPayment = monthlyPrincipalPayment;
        totalPayment = principalPayment + interestPayment;

        // Net Present Value shows balance BEFORE this month's payment
        // For month 1: show full amount, for month 2: show after month 1 payment, etc.
        netPresentValue = netCapital - (month - 1) * monthlyPrincipalPayment;
      } else {
        // Interest only type: balance stays same until final month
        const currentBalance = netCapital; // Always the full amount for interest-only
        interestPayment = currentBalance * monthlyCof;

        if (month === durationMonths) {
          // Last month: return all principal + interest
          principalPayment = currentBalance;
          totalPayment = principalPayment + interestPayment;
          netPresentValue = currentBalance; // Show full amount before final payment
        } else {
          // Regular months: only interest
          principalPayment = 0;
          totalPayment = interestPayment;
          netPresentValue = currentBalance; // Always show full amount
        }
      }

      accumulatedInterest += interestPayment;
    } else {
      // Post-completion month (shows investment is fully paid out)
      principalPayment = 0;
      interestPayment = 0;
      totalPayment = 0;
      netPresentValue = 0; // Investment fully completed
      // Don't add to accumulated interest
    }

    monthlyData.push({
      monthYear,
      month,
      principalPayment,
      interestPayment,
      totalPayment,
      netPresentValue: Math.max(0, netPresentValue),
      accumulatedInterest,
    });
  }

  return monthlyData;
}

/**
 * Calculate duration in months from start date to end date
 */
function calculateDurationMonths(startDate: Date, endDate: Date): number {
  return differenceInMonths(endDate, startDate);
}

/**
 * Calculate net capital by subtracting admin fee from gross capital
 */
function calculateNetCapital(grossCapital: number, adminFee: number): number {
  return grossCapital - adminFee;
}

/**
 * Get all installment investments for admin view
 */
export async function getAdminInstallmentInvestments(): Promise<AdminInstallmentSummary> {
  const db = createDrizzleConnection();

  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      grossCapital: accounts.capital,
      startDate: accounts.transaction_date,
      endDate: accounts.end_date,
      status: accounts.status,
      userId: accounts.user_id,
      // Installment specific fields
      monthlyCof: installmentAccounts.monthly_cof,
      adminFee: installmentAccounts.admin_fee,
      investmentType: installmentAccounts.investment_type,
    })
    .from(accounts)
    .innerJoin(
      installmentAccounts,
      eq(accounts.id, installmentAccounts.account_id)
    )
    .leftJoin(profiles, eq(accounts.user_id, profiles.id));

  // Get user emails for investor information
  const userProfiles = await db
    .select({
      userId: profiles.id,
      email: profiles.id, // Will join with auth.users to get email
    })
    .from(profiles);

  let totalGainedFunds = 0;
  let totalPresentValueFund = 0;
  let totalNetPresentValueFund = 0;
  const monthlyGainedFunds: { [monthYear: string]: number } = {};

  const investments = results.map((result) => {
    const grossCapital = Number(result.grossCapital);
    const adminFee = Number(result.adminFee);
    const netCapital = calculateNetCapital(grossCapital, adminFee);
    const monthlyCof = Number(result.monthlyCof);
    const durationMonths = calculateDurationMonths(
      result.startDate,
      result.endDate!
    );
    const investmentType = result.investmentType as
      | "principle"
      | "interest_only";
    const monthlyPrincipalPayment =
      investmentType === "principle" ? netCapital / durationMonths : null;

    // Calculate monthly data
    const monthlyData = calculateInstallmentData(
      netCapital,
      monthlyCof,
      durationMonths,
      investmentType,
      result.startDate
    );

    // Calculate metrics for admin view
    const totalInterestGained = monthlyData.reduce(
      (sum, month) => sum + month.interestPayment,
      0
    );
    const totalRedeemedAmount = monthlyData.reduce(
      (sum, month) => sum + month.totalPayment,
      0
    );

    // Present value fund is current value of the investment
    const presentValueFund = netCapital + totalInterestGained;
    const netPresentValueFund = presentValueFund - totalRedeemedAmount;

    // Accumulate admin totals
    totalGainedFunds += totalInterestGained;
    totalPresentValueFund += presentValueFund;
    totalNetPresentValueFund += netPresentValueFund;

    // Accumulate monthly gains for admin
    monthlyData.forEach((month) => {
      // Safety check to ensure monthYear is valid
      if (month && month.monthYear && typeof month.monthYear === "string") {
        if (!monthlyGainedFunds[month.monthYear]) {
          monthlyGainedFunds[month.monthYear] = 0;
        }
        monthlyGainedFunds[month.monthYear] += month.interestPayment;
      }
    });

    return {
      id: result.id,
      accountNumber: result.accountNumber,
      investorEmail: `investor-${result.userId}`, // Placeholder - would need to join with auth.users
      grossCapital,
      adminFee,
      netCapital,
      monthlyCof,
      durationMonths,
      investmentType,
      monthlyPrincipalPayment,
      startDate: result.startDate,
      endDate: result.endDate,
      status: result.status,
      monthlyData,
      presentValueFund,
      totalRedeemedAmount,
      netPresentValueFund,
      totalGainedFunds: totalInterestGained,
      totalNetInvestorFund: netCapital,
    } as InstallmentInvestment;
  });

  return {
    totalGainedFunds,
    totalPresentValueFund,
    totalNetPresentValueFund,
    investments,
    monthlyGainedFunds,
  };
}

/**
 * Get installment investments for a specific investor
 */
export async function getInvestorInstallmentInvestments(
  investorEmail: string
): Promise<InvestorInstallmentSummary | null> {
  const db = createDrizzleConnection();

  // First get the user profile by email - properly join with auth.users
  const userProfile = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(authUsers, eq(profiles.id, authUsers.id))
    .where(eq(authUsers.email, investorEmail))
    .limit(1);

  if (userProfile.length === 0) {
    return null;
  }

  const userId = userProfile[0].id;

  const results = await db
    .select({
      id: accounts.id,
      accountNumber: accounts.account_number,
      grossCapital: accounts.capital,
      startDate: accounts.transaction_date,
      endDate: accounts.end_date,
      status: accounts.status,
      // Installment specific fields
      monthlyCof: installmentAccounts.monthly_cof,
      adminFee: installmentAccounts.admin_fee,
      investmentType: installmentAccounts.investment_type,
    })
    .from(accounts)
    .innerJoin(
      installmentAccounts,
      eq(accounts.id, installmentAccounts.account_id)
    )
    .where(and(eq(accounts.user_id, userId), eq(accounts.status, "active")));

  if (results.length === 0) {
    return {
      investorEmail,
      totalNetInvestorFund: 0,
      totalRedeemedAmount: 0,
      investments: [],
    };
  }

  let totalNetInvestorFund = 0;
  let totalRedeemedAmount = 0;

  const investments = results.map((result) => {
    const grossCapital = Number(result.grossCapital);
    const adminFeePercentage = Number(result.adminFee);
    const netCapital = calculateNetCapital(grossCapital, adminFeePercentage);
    const monthlyCof = Number(result.monthlyCof);
    const durationMonths = calculateDurationMonths(
      result.startDate,
      result.endDate!
    );
    const investmentType = result.investmentType as
      | "principle"
      | "interest_only";
    const monthlyPrincipalPayment =
      investmentType === "principle" ? netCapital / durationMonths : null;

    // Calculate monthly data
    const monthlyData = calculateInstallmentData(
      netCapital,
      monthlyCof,
      durationMonths,
      investmentType,
      result.startDate
    );

    // Calculate metrics for investor view
    const totalRedeemedForAccount = monthlyData.reduce(
      (sum, month) => sum + month.totalPayment,
      0
    );
    const remainingNetFund =
      monthlyData.length > 0
        ? monthlyData[monthlyData.length - 1].netPresentValue
        : netCapital;

    totalNetInvestorFund += netCapital;
    totalRedeemedAmount += totalRedeemedForAccount;

    return {
      id: result.id,
      accountNumber: result.accountNumber,
      investorEmail,
      grossCapital,
      adminFee: grossCapital * adminFeePercentage,
      netCapital,
      monthlyCof,
      durationMonths,
      investmentType,
      monthlyPrincipalPayment,
      startDate: result.startDate,
      endDate: result.endDate,
      status: result.status,
      monthlyData,
      presentValueFund: 0, // Not needed for investor view
      totalRedeemedAmount: totalRedeemedForAccount,
      netPresentValueFund: 0, // Not needed for investor view
      totalGainedFunds: 0, // Not needed for investor view
      totalNetInvestorFund: remainingNetFund,
    } as InstallmentInvestment;
  });

  return {
    investorEmail,
    totalNetInvestorFund,
    totalRedeemedAmount,
    investments,
  };
}
