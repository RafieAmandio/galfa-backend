"use server";

import { getInvestorSummary } from "@/features/investor/actions/get-investor-summary";
import { getInvestorFloatingRateInvestments } from "@/features/floating-rate/actions/get-investor-floating-rate-investments";
import { getInvestorInstallmentInvestments } from "@/features/installment/actions/get-installments";
import { getAllVCPerformance } from "@/features/investments/actions/get-all-vc-performance";
import { getFundAllocations } from "@/features/fund-allocations/actions/get-fund-allocations";
import { getInvestorCapitalMarketInvestments } from "@/features/capital-market/actions/get-investor-capital-market-investments";

interface FlatRateInvestmentData {
  accountNumber: string;
  grossInvestedAmount: number;
  adminFee: number;
  netInvestedAmount: number;
  annualRate: number;
  startDate: Date;
  endDate: Date | null;
  currentValue: number;
  gainLoss: number;
}

interface FloatingRateInvestmentData {
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  presentValueFund: number;
  gainedFund: number;
  status: string;
}

interface InstallmentInvestmentData {
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  monthlyCof: number;
  durationMonths: number;
  investmentType: "principle" | "interest_only";
  totalRedeemedAmount: number;
}

interface CapitalMarketInvestmentData {
  performanceDate: Date;
  totalInvested: number;
  grossPerformance: number;
  netPerformance: number;
}

export interface VCPerformanceDataPoint {
  date: Date;
  aum: number;
  profitTaken: number;
  ihsgValue: number | null;
}

export interface FundAllocationData {
  id: number;
  name: string;
  description: string | null;
  aum: number;
  rateType: string;
  rateValue: number;
  rateLabel: string | null;
}

export interface InvestorReportData {
  email: string;
  summary: {
    totalNetInvestedFund: number;
    totalGrossInvestedFund: number;
    totalAdminFees: number;
    totalNetPresentValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
    activeInvestments: number;
  };
  flatRateInvestments: FlatRateInvestmentData[];
  floatingRateInvestments: FloatingRateInvestmentData[];
  installmentInvestments: InstallmentInvestmentData[];
  capitalMarketInvestments: CapitalMarketInvestmentData[];
  vcPerformance: VCPerformanceDataPoint[];
  fundAllocations: FundAllocationData[];
}

export async function getReportData(
  investorEmail: string
): Promise<{ success: boolean; data?: InvestorReportData; error?: string }> {
  try {
    // Fetch all investment data in parallel
    const [flatRateData, floatingRateResult, installmentData, capitalMarketResult, vcPerformanceResult, fundAllocationsResult] =
      await Promise.all([
        getInvestorSummary(investorEmail),
        getInvestorFloatingRateInvestments(investorEmail),
        getInvestorInstallmentInvestments(investorEmail),
        getInvestorCapitalMarketInvestments(investorEmail),
        getAllVCPerformance(),
        getFundAllocations(),
      ]);

    // Process flat rate investments
    const flatRateInvestments: FlatRateInvestmentData[] = flatRateData
      ? flatRateData.investments.map((inv) => ({
          accountNumber: inv.accountNumber,
          grossInvestedAmount: inv.grossInvestedAmount,
          adminFee: inv.adminFee,
          netInvestedAmount: inv.netInvestedAmount,
          annualRate: inv.annualRate,
          startDate: inv.startDate,
          endDate: inv.endDate,
          currentValue: inv.currentValue,
          gainLoss: inv.gainLoss,
        }))
      : [];

    // Process floating rate investments
    const floatingRateInvestments: FloatingRateInvestmentData[] =
      floatingRateResult.success && floatingRateResult.data
        ? floatingRateResult.data.investments.map((inv) => ({
            accountNumber: inv.accountNumber,
            grossCapital: inv.grossCapital,
            adminFee: inv.adminFee,
            netInvestorFund: inv.netInvestorFund,
            presentValueFund: inv.presentValueFund,
            gainedFund: inv.gainedFund,
            status: inv.status,
          }))
        : [];

    // Process installment investments
    const installmentInvestments: InstallmentInvestmentData[] = installmentData
      ? installmentData.investments.map((inv) => ({
          accountNumber: inv.accountNumber,
          grossCapital: inv.grossCapital,
          adminFee: inv.adminFee,
          netCapital: inv.netCapital,
          monthlyCof: inv.monthlyCof,
          durationMonths: inv.durationMonths,
          investmentType: inv.investmentType,
          totalRedeemedAmount: inv.totalRedeemedAmount,
        }))
      : [];

    // Process capital market investments
    const capitalMarketInvestments: CapitalMarketInvestmentData[] =
      capitalMarketResult.hasData
        ? capitalMarketResult.investments.map((inv) => ({
            performanceDate: inv.performanceDate,
            totalInvested: inv.totalInvested,
            grossPerformance: inv.grossPerformance,
            netPerformance: inv.netPerformance,
          }))
        : [];

    // Process VC performance data (last 12 months, sorted by date ascending)
    const vcPerformance: VCPerformanceDataPoint[] =
      vcPerformanceResult.success && vcPerformanceResult.data
        ? vcPerformanceResult.data
            .slice(0, 12) // Take last 12 records (already sorted desc by date)
            .reverse() // Reverse to get ascending order for chart
            .map((record) => ({
              date: record.date,
              aum: record.aum,
              profitTaken: record.profitTaken,
              ihsgValue: record.ihsgValue,
            }))
        : [];

    // Process fund allocations
    const fundAllocations: FundAllocationData[] =
      fundAllocationsResult.success && fundAllocationsResult.data
        ? fundAllocationsResult.data.map((allocation) => ({
            id: allocation.id,
            name: allocation.name,
            description: allocation.description,
            aum: allocation.aum,
            rateType: allocation.rate_type,
            rateValue: allocation.rate_value,
            rateLabel: allocation.rate_label,
          }))
        : [];

    // Calculate summary totals
    let totalNetInvestedFund = 0;
    let totalGrossInvestedFund = 0;
    let totalAdminFees = 0;
    let totalNetPresentValue = 0;
    let activeInvestments = 0;

    // Add flat rate totals
    if (flatRateData) {
      totalNetInvestedFund += flatRateData.totalNetInvestedFund;
      totalGrossInvestedFund += flatRateData.totalGrossInvestedFund;
      totalAdminFees += flatRateData.totalAdminFees;
      totalNetPresentValue += flatRateData.totalNetPresentValue;
      activeInvestments += flatRateData.activeInvestments;
    }

    // Add floating rate totals
    if (floatingRateResult.success && floatingRateResult.data) {
      totalNetInvestedFund += floatingRateResult.data.totalNetInvestorFund;
      totalGrossInvestedFund += floatingRateResult.data.totalGrossCapital;
      totalAdminFees += floatingRateResult.data.totalAdminFees;
      totalNetPresentValue += floatingRateResult.data.totalGainedFund;
      activeInvestments += floatingRateResult.data.activeAccountsCount;
    }

    // Add installment totals
    if (installmentData) {
      totalNetInvestedFund += installmentData.totalNetInvestorFund;
      totalGrossInvestedFund += installmentData.investments.reduce(
        (sum, inv) => sum + inv.grossCapital,
        0
      );
      totalAdminFees += installmentData.investments.reduce(
        (sum, inv) => sum + inv.adminFee,
        0
      );
      const remainingValue =
        installmentData.totalNetInvestorFund -
        installmentData.totalRedeemedAmount;
      totalNetPresentValue += remainingValue;
      activeInvestments += installmentData.investments.length;
    }

    // Add capital market totals (using latest record values)
    if (capitalMarketResult.hasData) {
      totalNetInvestedFund += capitalMarketResult.latestTotalInvested;
      totalGrossInvestedFund += capitalMarketResult.latestTotalInvested;
      // Net performance is the current value
      totalNetPresentValue += capitalMarketResult.latestTotalInvested + capitalMarketResult.latestNetPerformance;
      activeInvestments += 1; // Capital market counts as 1 account
    }

    const totalGainLoss = totalNetPresentValue - totalNetInvestedFund;
    const totalGainLossPercentage =
      totalNetInvestedFund > 0
        ? (totalGainLoss / totalNetInvestedFund) * 100
        : 0;

    const reportData: InvestorReportData = {
      email: investorEmail,
      summary: {
        totalNetInvestedFund,
        totalGrossInvestedFund,
        totalAdminFees,
        totalNetPresentValue,
        totalGainLoss,
        totalGainLossPercentage,
        activeInvestments,
      },
      flatRateInvestments,
      floatingRateInvestments,
      installmentInvestments,
      capitalMarketInvestments,
      vcPerformance,
      fundAllocations,
    };

    return { success: true, data: reportData };
  } catch (error) {
    console.error("Error fetching report data:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch report data",
    };
  }
}
