import {
  getMonthlyCompoundRate,
  calculateCompoundInterest,
} from "./rate-calculations";

interface MonthlyGrowth {
  month: string;
  monthNumber: number;
  beginningBalance: number;
  monthlyInterest: number;
  endingBalance: number;
  cumulativeInterest: number;
}

interface InvestmentSummary {
  grossInvestment: number;
  adminFee: number;
  adminFeePercentage: number;
  netInvestorFund: number;
  annualRate: number;
  monthlyRate: number;
  startDate: string;
  endDate: string;
  totalMonths: number;
  finalValue: number;
  totalInterestEarned: number;
  monthlyGrowth: MonthlyGrowth[];
}

// Admin fee percentage - centralized configuration
export const ADMIN_FEE_PERCENTAGE = 0.05; // 5%

/**
 * Calculate investment growth with admin fee applied in backend
 * @param grossCapital - Full capital amount from database
 * @param annualRate - Annual interest rate
 * @param startDate - Investment start date
 * @param endDate - Investment end date
 */
export function calculateInvestmentGrowth(
  grossCapital: number,
  annualRate: number,
  startDate: Date,
  endDate: Date
): InvestmentSummary {
  // Apply admin fee in backend
  const adminFee = grossCapital * ADMIN_FEE_PERCENTAGE;
  const netInvestorFund = grossCapital - adminFee;
  const monthlyRate = getMonthlyCompoundRate(netInvestorFund, annualRate);

  // Calculate months between dates
  const totalMonths = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  const monthlyGrowth: MonthlyGrowth[] = [];
  let currentBalance = netInvestorFund;

  // Calculate growth for each month
  for (let month = 1; month <= totalMonths; month++) {
    const beginningBalance = currentBalance;
    const monthlyInterest = beginningBalance * monthlyRate;
    const endingBalance = beginningBalance + monthlyInterest;
    const cumulativeInterest = endingBalance - netInvestorFund;

    // Calculate the date for this month
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + month - 1);

    const monthString = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    monthlyGrowth.push({
      month: monthString,
      monthNumber: month,
      beginningBalance,
      monthlyInterest,
      endingBalance,
      cumulativeInterest,
    });

    currentBalance = endingBalance;
  }

  const finalValue = calculateCompoundInterest(
    netInvestorFund,
    annualRate,
    totalMonths
  );
  const totalInterestEarned = finalValue - netInvestorFund;

  return {
    grossInvestment: grossCapital,
    adminFee,
    adminFeePercentage: ADMIN_FEE_PERCENTAGE,
    netInvestorFund,
    annualRate,
    monthlyRate,
    startDate: startDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    endDate: endDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    totalMonths,
    finalValue,
    totalInterestEarned,
    monthlyGrowth,
  };
}

/**
 * Calculate Rafie's investment growth month by month
 * Updated to use the generic function with backend admin fee calculation
 */
export function calculateRafieInvestmentGrowth(): InvestmentSummary {
  const grossInvestment = 1_000_000_000; // Rp 1 billion (from database)
  const annualRate = 0.17; // 17%
  const startDate = new Date("2024-04-19");
  const endDate = new Date("2025-04-19");

  return calculateInvestmentGrowth(
    grossInvestment,
    annualRate,
    startDate,
    endDate
  );
}

/**
 * Format currency in Indonesian Rupiah
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(rate: number, decimals: number = 4): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Display the investment calculation results
 */
export function displayRafieInvestmentResults(): void {
  const results = calculateRafieInvestmentGrowth();

  console.log("=".repeat(80));
  console.log("RAFIE'S FIXED RATE INVESTMENT CALCULATION");
  console.log("=".repeat(80));

  console.log("\nINVESTMENT SUMMARY:");
  console.log(
    `Gross Investment (Database): ${formatIDR(results.grossInvestment)}`
  );
  console.log(
    `Admin Fee (${formatPercentage(
      results.adminFeePercentage,
      1
    )} - Applied in Backend): ${formatIDR(results.adminFee)}`
  );
  console.log(
    `Net Investor Fund (Calculation Base): ${formatIDR(
      results.netInvestorFund
    )}`
  );
  console.log(
    `Annual Interest Rate: ${formatPercentage(results.annualRate, 2)}`
  );
  console.log(
    `Monthly Compound Rate: ${formatPercentage(results.monthlyRate, 4)}`
  );
  console.log(`Investment Period: ${results.startDate} to ${results.endDate}`);
  console.log(`Total Months: ${results.totalMonths}`);

  console.log("\nMONTHLY GROWTH BREAKDOWN:");
  console.log("-".repeat(100));
  console.log(
    "Month".padEnd(15) +
      "Beginning Balance".padEnd(18) +
      "Monthly Interest".padEnd(18) +
      "Ending Balance".padEnd(18) +
      "Cumulative Interest".padEnd(20)
  );
  console.log("-".repeat(100));

  results.monthlyGrowth.forEach((month) => {
    console.log(
      `${month.monthNumber}. ${month.month}`.padEnd(15) +
        formatIDR(month.beginningBalance).padEnd(18) +
        formatIDR(month.monthlyInterest).padEnd(18) +
        formatIDR(month.endingBalance).padEnd(18) +
        formatIDR(month.cumulativeInterest).padEnd(20)
    );
  });

  console.log("-".repeat(100));
  console.log("\nFINAL RESULTS:");
  console.log(
    `Final Value after ${results.totalMonths} months: ${formatIDR(
      results.finalValue
    )}`
  );
  console.log(
    `Total Interest Earned: ${formatIDR(results.totalInterestEarned)}`
  );
  console.log(
    `Return on Net Investment: ${formatPercentage(
      results.totalInterestEarned / results.netInvestorFund,
      2
    )}`
  );
  console.log(
    `Effective Annual Return: ${formatPercentage(results.annualRate, 2)}`
  );
}
