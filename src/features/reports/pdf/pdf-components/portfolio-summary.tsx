import { View, Text } from "@react-pdf/renderer";
import { styles } from "../pdf-styles";

interface PortfolioSummaryProps {
  totalNetFund: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  activeInvestments: number;
  adminFees: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PortfolioSummary({
  totalNetFund,
  currentValue,
  gainLoss,
  gainLossPercentage,
  activeInvestments,
  adminFees,
}: PortfolioSummaryProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfolio Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Net Fund</Text>
          <Text style={styles.summaryCardValue}>
            {formatCurrency(totalNetFund)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Current Value</Text>
          <Text style={styles.summaryCardValue}>
            {formatCurrency(currentValue)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Gain/Loss</Text>
          <Text
            style={
              gainLoss >= 0
                ? styles.summaryCardValuePositive
                : styles.summaryCardValueNegative
            }
          >
            {formatCurrency(gainLoss)} ({gainLossPercentage >= 0 ? "+" : ""}
            {gainLossPercentage.toFixed(2)}%)
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Active Investments</Text>
          <Text style={styles.summaryCardValue}>{activeInvestments}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Admin Fees</Text>
          <Text style={styles.summaryCardValue}>
            {formatCurrency(adminFees)}
          </Text>
        </View>
      </View>
    </View>
  );
}
