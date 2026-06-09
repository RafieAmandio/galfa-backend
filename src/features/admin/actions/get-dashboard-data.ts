"use server";

import { getFixRatePrincipleByMonth } from "@/features/flat-rate/actions/get-fix-rate-principle-by-month";
import { getFixRateCoFByMonth } from "@/features/flat-rate/actions/get-fix-rate-cof-by-month";
import { getInflowByMonth } from "@/features/investments/actions/get-inflow-by-month";
import { getOutflowByMonth } from "@/features/investments/actions/get-outflow-by-month";
import { getVCPerformanceByMonth } from "@/features/investments/actions/get-vc-performance-by-month";
import { getGrossProfitByMonth } from "@/features/investments/actions/get-gross-profit-by-month";
import { getInstallmentPrincipleByMonth } from "@/features/installment/actions/get-installment-principle-by-month";
import { getInstallmentCoFByMonth } from "@/features/installment/actions/get-installment-cof-by-month";
import { getFloatingRatePrincipleByMonth } from "@/features/floating-rate/actions/get-floating-rate-principle-by-month/index";
import { getFloatingRateGrowthPercentage } from "@/features/floating-rate/actions/get-floating-rate-growth-percentage/index";

export async function getDashboardData(month: Date) {
  const [
    fixRatePrinciple,
    fixRateCoF,
    inflow,
    outflow,
    vcPerformance,
    grossProfit,
    installmentPrinciple,
    installmentCoF,
    floatingRatePrinciple,
    floatingRateGrowth,
  ] = await Promise.all([
    getFixRatePrincipleByMonth(month),
    getFixRateCoFByMonth(month),
    getInflowByMonth(month),
    getOutflowByMonth(month),
    getVCPerformanceByMonth(month),
    getGrossProfitByMonth(month),
    getInstallmentPrincipleByMonth(month),
    getInstallmentCoFByMonth(month),
    getFloatingRatePrincipleByMonth(month),
    getFloatingRateGrowthPercentage(month),
  ]);

  const totalGrossProfit = grossProfit.success && grossProfit.data ? grossProfit.data.grossProfit : 0;
  const fixCoFValue = fixRateCoF.success && fixRateCoF.data ? fixRateCoF.data.totalGainFund : 0;
  const installmentCoFValue = installmentCoF.success && installmentCoF.data ? installmentCoF.data.totalGainedFunds : 0;
  const floatingPrincipleValue = floatingRatePrinciple.success && floatingRatePrinciple.data ? floatingRatePrinciple.data.totalNetCapital : 0;

  const floatingRateAllocatedProfit = totalGrossProfit - fixCoFValue - installmentCoFValue;
  const performancePercentage = floatingPrincipleValue > 0
    ? (floatingRateAllocatedProfit / floatingPrincipleValue) * 100
    : 0;

  return {
    fixRatePrinciple,
    fixRateCoF,
    inflow,
    outflow,
    vcPerformance,
    grossProfit,
    installmentPrinciple,
    installmentCoF,
    floatingRatePrinciple,
    floatingRateGrowth,
    floatingRateAllocatedProfit: {
      success: true,
      message: "Calculated from consolidated data",
      data: {
        month,
        totalGrossProfit,
        fixRateCoF: fixCoFValue,
        installmentCoF: installmentCoFValue,
        floatingRateAllocatedProfit,
        floatingRatePrinciple: floatingPrincipleValue,
        performancePercentage,
        calculation: {
          formula: "Floating Rate Profit = Total Gross Profit - Fixed Rate CoF - Installment CoF",
          breakdown: `${totalGrossProfit.toLocaleString("id-ID")} - ${fixCoFValue.toLocaleString("id-ID")} - ${installmentCoFValue.toLocaleString("id-ID")} = ${floatingRateAllocatedProfit.toLocaleString("id-ID")}`,
          performanceFormula: "Performance % = (Floating Rate Profit / Floating Rate Principle) × 100",
          performanceBreakdown: floatingPrincipleValue > 0
            ? `(${floatingRateAllocatedProfit.toLocaleString("id-ID")} / ${floatingPrincipleValue.toLocaleString("id-ID")}) × 100 = ${performancePercentage.toFixed(2)}%`
            : "No principle data available for calculation",
        },
        hasGrossProfitData: !!(grossProfit.success && grossProfit.data),
        hasFixRateData: !!(fixRateCoF.success && fixRateCoF.data),
        hasInstallmentData: !!(installmentCoF.success && installmentCoF.data),
        hasPrincipleData: !!(floatingRatePrinciple.success && floatingRatePrinciple.data),
      },
    },
  };
}
