// This file is deprecated - use npv-calculator-with-redemptions.ts instead
// Keeping for backward compatibility

export {
  calculateNetPresentValueWithRedemptions as calculateNetPresentValue,
  calculateNetPresentValueWithKnownRedemptions,
} from "./npv-calculator-with-redemptions";

// Re-export the type with a different name
export type { NPVWithRedemptions as NPVResult } from "./npv-calculator-with-redemptions";

// Legacy wrapper function for client-side use without redemptions
import { calculateNetPresentValueWithKnownRedemptions } from "./npv-calculator-with-redemptions";

/**
 * @deprecated Use calculateNetPresentValueWithRedemptions or calculateNetPresentValueWithKnownRedemptions instead
 * Legacy function for backward compatibility - assumes no redemptions
 */
export function calculateNetPresentValueLegacy(
  grossCapital: number,
  annualRate: number,
  startDate: Date,
  currentDate: Date = new Date(),
  isRollover: boolean = false,
  adminFeeApplied: boolean = true
) {
  return calculateNetPresentValueWithKnownRedemptions(
    grossCapital,
    annualRate,
    startDate,
    currentDate,
    isRollover,
    adminFeeApplied,
    [] // No redemptions
  );
}
