"use server";

import { getInvestorSummary } from "./get-investor-summary";
import { getInvestorFloatingRateInvestments } from "@/features/floating-rate/actions/get-investor-floating-rate-investments";
import { getInvestorInstallmentInvestments } from "@/features/installment/actions/get-installments";

export interface ComprehensiveInvestorSummary {
  email: string;
  // Combined totals
  totalNetInvestedFund: number;
  totalNetPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  activeInvestments: number;

  // Flat rate investments
  flatRateInvestments: {
    totalNetInvestedFund: number;
    totalNetPresentValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
    activeInvestments: number;
    hasData: boolean;
  };

  // Floating rate investments
  floatingRateInvestments: {
    totalNetCapital: number;
    totalGainedFund: number;
    activeInvestments: number;
    hasData: boolean;
  };

  // Installment investments
  installmentInvestments: {
    totalNetInvestorFund: number;
    totalRedeemedAmount: number;
    activeInvestments: number;
    hasData: boolean;
  };
}

export async function getComprehensiveInvestorSummary(
  investorEmail: string
): Promise<ComprehensiveInvestorSummary | null> {
  // Get data from all investment types in parallel
  const [flatRateData, floatingRateData, installmentData] = await Promise.all([
    getInvestorSummary(investorEmail),
    getInvestorFloatingRateInvestments(investorEmail),
    getInvestorInstallmentInvestments(investorEmail),
  ]);

  // Check if we have any data at all
  const hasFlatRateData = flatRateData !== null;
  const hasFloatingRateData =
    floatingRateData?.success &&
    floatingRateData.data &&
    floatingRateData.data.investments.length > 0;
  const hasInstallmentData =
    installmentData !== null && installmentData.investments.length > 0;

  if (!hasFlatRateData && !hasFloatingRateData && !hasInstallmentData) {
    return null;
  }

  // Initialize combined totals
  let totalNetInvestedFund = 0;
  let totalNetPresentValue = 0;
  let totalGainLoss = 0;
  let activeInvestments = 0;

  // Process flat rate data
  const flatRateInvestments = {
    totalNetInvestedFund: 0,
    totalNetPresentValue: 0,
    totalGainLoss: 0,
    totalGainLossPercentage: 0,
    activeInvestments: 0,
    hasData: hasFlatRateData,
  };

  if (hasFlatRateData) {
    flatRateInvestments.totalNetInvestedFund =
      flatRateData.totalNetInvestedFund;
    flatRateInvestments.totalNetPresentValue =
      flatRateData.totalNetPresentValue;
    flatRateInvestments.totalGainLoss = flatRateData.totalGainLoss;
    flatRateInvestments.totalGainLossPercentage =
      flatRateData.totalGainLossPercentage;
    flatRateInvestments.activeInvestments = flatRateData.activeInvestments;

    // Add to combined totals
    totalNetInvestedFund += flatRateData.totalNetInvestedFund;
    totalNetPresentValue += flatRateData.totalNetPresentValue;
    totalGainLoss += flatRateData.totalGainLoss;
    activeInvestments += flatRateData.activeInvestments;
  }

  // Process floating rate data
  const floatingRateInvestments = {
    totalNetCapital: 0,
    totalGainedFund: 0,
    activeInvestments: 0,
    hasData: Boolean(hasFloatingRateData),
  };

  if (hasFloatingRateData) {
    const frData = floatingRateData.data!;
    floatingRateInvestments.totalNetCapital = frData.totalNetInvestorFund;
    floatingRateInvestments.totalGainedFund = frData.totalGainedFund;
    floatingRateInvestments.activeInvestments = frData.activeAccountsCount;

    // Add to combined totals
    totalNetInvestedFund += frData.totalNetInvestorFund;
    totalNetPresentValue += frData.totalGainedFund; // For floating rate, current value is gained fund
    totalGainLoss += frData.totalGainedFund - frData.totalNetInvestorFund;
    activeInvestments += frData.activeAccountsCount;
  }

  // Process installment data
  const installmentInvestments = {
    totalNetInvestorFund: 0,
    totalRedeemedAmount: 0,
    activeInvestments: 0,
    hasData: hasInstallmentData,
  };

  if (hasInstallmentData) {
    installmentInvestments.totalNetInvestorFund =
      installmentData.totalNetInvestorFund;
    installmentInvestments.totalRedeemedAmount =
      installmentData.totalRedeemedAmount;
    installmentInvestments.activeInvestments =
      installmentData.investments.length;

    // Add to combined totals
    totalNetInvestedFund += installmentData.totalNetInvestorFund;
    // For installments, current value is remaining fund after redemptions
    const remainingValue =
      installmentData.totalNetInvestorFund -
      installmentData.totalRedeemedAmount;
    totalNetPresentValue += remainingValue;
    totalGainLoss += installmentData.totalRedeemedAmount; // Redeemed amount is the gain
    activeInvestments += installmentData.investments.length;
  }

  // Calculate combined gain/loss percentage
  const totalGainLossPercentage =
    totalNetInvestedFund > 0 ? (totalGainLoss / totalNetInvestedFund) * 100 : 0;

  return {
    email: investorEmail,
    totalNetInvestedFund,
    totalNetPresentValue,
    totalGainLoss,
    totalGainLossPercentage,
    activeInvestments,
    flatRateInvestments,
    floatingRateInvestments,
    installmentInvestments,
  };
}
