import {
  calculateRafieInvestmentGrowth,
  displayRafieInvestmentResults,
  formatIDR,
  formatPercentage,
} from "../lib/utils/investment-calculator";

// Run the calculation and display results
console.log("Running Rafie's Investment Growth Calculation...\n");

// Get the calculation results
const results = calculateRafieInvestmentGrowth();

// Display detailed results
displayRafieInvestmentResults();

// Export results for potential use in other parts of the application
export { results };
