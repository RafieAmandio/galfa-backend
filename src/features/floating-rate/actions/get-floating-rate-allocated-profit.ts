"use server";

import { checkAdminAccess } from "@/lib/auth/admin-check";
import { getGrossProfitByMonth } from "../../investments/actions/get-gross-profit-by-month";
import { getFixRateCoFByMonth } from "../../flat-rate/actions/get-fix-rate-cof-by-month";
import { getInstallmentCoFByMonth } from "../../installment/actions/get-installment-cof-by-month";
import { getFloatingRatePrincipleByMonth } from "./get-floating-rate-principle-by-month";

interface FloatingRateAllocatedProfitData {
  month: Date;
  totalGrossProfit: number;
  fixRateCoF: number;
  installmentCoF: number;
  floatingRateAllocatedProfit: number;
  floatingRatePrinciple: number;
  performancePercentage: number;
  calculation: {
    formula: string;
    breakdown: string;
    performanceFormula: string;
    performanceBreakdown: string;
  };
  hasGrossProfitData: boolean;
  hasFixRateData: boolean;
  hasInstallmentData: boolean;
  hasPrincipleData: boolean;
}

interface FloatingRateAllocatedProfitResult {
  success: boolean;
  message: string;
  data?: FloatingRateAllocatedProfitData;
}

/**
 * Calculate gross profit allocated to floating rate investments
 * Formula: Total Gross Profit - Fixed Rate CoF - Installment CoF
 */
export async function getFloatingRateAllocatedProfit(
  month: Date
): Promise<FloatingRateAllocatedProfitResult> {
  // Check admin access
  const adminCheck = await checkAdminAccess();
  if (!adminCheck.isAdmin) {
    return {
      success: false,
      message: "Unauthorized: Admin access required",
    };
  }

  try {
    // Get all required data in parallel
    const [
      grossProfitResult,
      fixRateCoFResult,
      installmentCoFResult,
      floatingRatePrincipleResult,
    ] = await Promise.all([
      getGrossProfitByMonth(month),
      getFixRateCoFByMonth(month),
      getInstallmentCoFByMonth(month),
      getFloatingRatePrincipleByMonth(month),
    ]);

    // Initialize values
    let totalGrossProfit = 0;
    let fixRateCoF = 0;
    let installmentCoF = 0;
    let floatingRatePrinciple = 0;

    // Extract gross profit
    const hasGrossProfitData = !!(
      grossProfitResult.success && grossProfitResult.data
    );
    if (hasGrossProfitData) {
      totalGrossProfit = grossProfitResult.data!.grossProfit;
    }

    // Extract fixed rate CoF
    const hasFixRateData = !!(
      fixRateCoFResult.success && fixRateCoFResult.data
    );
    if (hasFixRateData) {
      fixRateCoF = fixRateCoFResult.data!.totalGainFund;
    }

    // Extract installment CoF
    const hasInstallmentData = !!(
      installmentCoFResult.success && installmentCoFResult.data
    );
    if (hasInstallmentData) {
      installmentCoF = installmentCoFResult.data!.totalGainedFunds;
    }

    // Extract floating rate principle
    const hasPrincipleData = !!(
      floatingRatePrincipleResult.success && floatingRatePrincipleResult.data
    );
    if (hasPrincipleData) {
      floatingRatePrinciple = floatingRatePrincipleResult.data!.totalNetCapital;
    }

    // Calculate floating rate allocated profit
    const floatingRateAllocatedProfit =
      totalGrossProfit - fixRateCoF - installmentCoF;

    // Calculate performance percentage
    const performancePercentage =
      floatingRatePrinciple > 0
        ? (floatingRateAllocatedProfit / floatingRatePrinciple) * 100
        : 0;

    // Build calculation breakdown
    const formula =
      "Floating Rate Profit = Total Gross Profit - Fixed Rate CoF - Installment CoF";
    const breakdown = `${totalGrossProfit.toLocaleString(
      "id-ID"
    )} - ${fixRateCoF.toLocaleString(
      "id-ID"
    )} - ${installmentCoF.toLocaleString(
      "id-ID"
    )} = ${floatingRateAllocatedProfit.toLocaleString("id-ID")}`;

    const performanceFormula =
      "Performance % = (Floating Rate Profit / Floating Rate Principle) × 100";
    const performanceBreakdown =
      floatingRatePrinciple > 0
        ? `(${floatingRateAllocatedProfit.toLocaleString(
            "id-ID"
          )} / ${floatingRatePrinciple.toLocaleString(
            "id-ID"
          )}) × 100 = ${performancePercentage.toFixed(2)}%`
        : "No principle data available for calculation";

    const data: FloatingRateAllocatedProfitData = {
      month,
      totalGrossProfit,
      fixRateCoF,
      installmentCoF,
      floatingRateAllocatedProfit,
      floatingRatePrinciple,
      performancePercentage,
      calculation: {
        formula,
        breakdown,
        performanceFormula,
        performanceBreakdown,
      },
      hasGrossProfitData,
      hasFixRateData,
      hasInstallmentData,
      hasPrincipleData,
    };

    // Determine success message
    let message =
      "Successfully calculated floating rate allocated profit and performance percentage";
    const warnings = [];

    if (!hasGrossProfitData) {
      warnings.push("no gross profit data found");
    }
    if (!hasFixRateData) {
      warnings.push("no fixed rate CoF data found");
    }
    if (!hasInstallmentData) {
      warnings.push("no installment CoF data found");
    }
    if (!hasPrincipleData) {
      warnings.push("no floating rate principle data found");
    }

    if (warnings.length > 0) {
      message += ` (Warning: ${warnings.join(", ")})`;
    }

    return {
      success: true,
      message,
      data,
    };
  } catch (error) {
    console.error("Get floating rate allocated profit error:", error);
    return {
      success: false,
      message:
        "An error occurred while calculating floating rate allocated profit",
    };
  }
}
