/**
 * Calculate monthly compound rate from annual rate
 *
 * @param {number} annualRate - Annual rate as decimal (e.g., 0.17 for 17%)
 * @returns {number} - Monthly compound rate as decimal
 */
export function getMonthlyCompoundRate(
  capital: number,
  annualRate: number
): number {
  // Formula: (1 + annual_rate)^(1/12) - 1
  return Math.pow((capital * (1 + annualRate)) / capital, 1 / 12) - 1;
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
  const monthlyRate = getMonthlyCompoundRate(principal, annualRate);
  return principal * Math.pow(1 + monthlyRate, months);
}
