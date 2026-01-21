import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-auth-helpers";
import { getReportData } from "@/features/reports/actions/get-report-data";
import { getInvestorSummary } from "@/features/investor/actions/get-investor-summary";
import { getInvestorFloatingRateInvestments } from "@/features/floating-rate/actions/get-investor-floating-rate-investments";
import { getInvestorInstallmentInvestments } from "@/features/installment/actions/get-installments";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetEmail = email || user.email;

  try {
    // Get raw data from each source
    const [flatRateData, floatingRateResult, installmentData] =
      await Promise.all([
        getInvestorSummary(targetEmail),
        getInvestorFloatingRateInvestments(targetEmail),
        getInvestorInstallmentInvestments(targetEmail),
      ]);

    // Get the processed report data
    const reportResult = await getReportData(targetEmail);

    return NextResponse.json({
      targetEmail,
      rawData: {
        flatRate: {
          hasData: flatRateData !== null,
          investmentCount: flatRateData?.investments?.length ?? 0,
          totals: flatRateData
            ? {
                totalNetInvestedFund: flatRateData.totalNetInvestedFund,
                totalGrossInvestedFund: flatRateData.totalGrossInvestedFund,
                totalAdminFees: flatRateData.totalAdminFees,
                totalNetPresentValue: flatRateData.totalNetPresentValue,
                totalGainLoss: flatRateData.totalGainLoss,
                activeInvestments: flatRateData.activeInvestments,
              }
            : null,
          sampleInvestment: flatRateData?.investments?.[0] ?? null,
        },
        floatingRate: {
          success: floatingRateResult.success,
          message: floatingRateResult.message,
          hasData: floatingRateResult.data !== undefined,
          investmentCount:
            floatingRateResult.data?.investments?.length ?? 0,
          totals: floatingRateResult.data
            ? {
                totalGrossCapital: floatingRateResult.data.totalGrossCapital,
                totalNetInvestorFund:
                  floatingRateResult.data.totalNetInvestorFund,
                totalAdminFees: floatingRateResult.data.totalAdminFees,
                totalPresentValueFund:
                  floatingRateResult.data.totalPresentValueFund,
                totalGainedFund: floatingRateResult.data.totalGainedFund,
                activeAccountsCount:
                  floatingRateResult.data.activeAccountsCount,
              }
            : null,
          sampleInvestment: floatingRateResult.data?.investments?.[0] ?? null,
        },
        installment: {
          hasData: installmentData !== null,
          investmentCount: installmentData?.investments?.length ?? 0,
          totals: installmentData
            ? {
                totalNetInvestorFund: installmentData.totalNetInvestorFund,
                totalRedeemedAmount: installmentData.totalRedeemedAmount,
              }
            : null,
          sampleInvestment: installmentData?.investments?.[0]
            ? {
                accountNumber: installmentData.investments[0].accountNumber,
                grossCapital: installmentData.investments[0].grossCapital,
                adminFee: installmentData.investments[0].adminFee,
                netCapital: installmentData.investments[0].netCapital,
                monthlyCof: installmentData.investments[0].monthlyCof,
                durationMonths: installmentData.investments[0].durationMonths,
                investmentType: installmentData.investments[0].investmentType,
                totalRedeemedAmount:
                  installmentData.investments[0].totalRedeemedAmount,
              }
            : null,
        },
      },
      processedReportData: reportResult,
    });
  } catch (error) {
    console.error("Debug report data error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
