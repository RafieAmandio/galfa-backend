/**
 * Calculate simple monthly rate from annual rate
 *
 * @param {number} annualRate - Annual rate as decimal (e.g., 0.12 for 12%)
 * @returns {number} - Monthly rate as decimal (e.g., 0.01 for 1%)
 */
export function getMonthlyCompoundRate(annualRate: number): number {
  return annualRate / 12;
}

/**
 * Calculate compound interest for a given period
 *
 * @param {number} principal - Initial amount
 * @param {number} annualRate - Annual rate as decimal
 * @param {number} months - Number of months
 * @returns {number} - Final amount after compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  months: number
): number {
  const monthlyRate = getMonthlyCompoundRate(annualRate);
  return principal * Math.pow(1 + monthlyRate, months);
}
