/**
 * Cache for monthly growth rates - this data doesn't change often
 */
export const monthlyGrowthRatesCache = new Map<
  string,
  Array<{
    month: Date;
    growthPercentage: number;
    performancePercentage: number;
    hasData: boolean;
  }>
>();

/**
 * Cache for VC performance data - this data doesn't change often
 */
export const vcPerformanceDataCache = new Map<string, Record<string, any[]>>();

/**
 * Cache for redemptions - this data changes less frequently than pagination
 */
export const redemptionsCache = new Map<
  string,
  Record<
    number,
    Array<{
      amount: number;
      transactionDate: Date;
      status: string;
      description?: string;
    }>
  >
>();

/**
 * Clear all caches - call this when data changes
 */
export function clearFloatingRateCaches() {
  monthlyGrowthRatesCache.clear();
  vcPerformanceDataCache.clear();
  redemptionsCache.clear();
}
