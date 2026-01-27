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

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function PortfolioSummary({
  totalNetFund,
  currentValue,
  gainLoss,
  gainLossPercentage,
  activeInvestments,
  adminFees,
}: PortfolioSummaryProps) {
  const isPositive = gainLoss >= 0;

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Text style={styles.sectionIconText}>$</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Portfolio Summary</Text>
          <Text style={styles.sectionSubtitle}>
            Overview of your total investment position
          </Text>
        </View>
      </View>

      {/* Summary Cards Grid */}
      <View style={styles.summaryGrid}>
        {/* Current Value - Highlighted */}
        <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
          <Text style={[styles.summaryCardLabel, styles.summaryCardLabelLight]}>
            Current Portfolio Value
          </Text>
          <Text style={[styles.summaryCardValue, styles.summaryCardValueLight]}>
            {formatCurrency(currentValue)}
          </Text>
          <Text style={[styles.summaryCardSubtext, styles.summaryCardSubtextLight]}>
            Present market value
          </Text>
        </View>

        {/* Total Net Fund */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Net Invested Fund</Text>
          <Text style={styles.summaryCardValue}>
            {formatCurrency(totalNetFund)}
          </Text>
          <Text style={styles.summaryCardSubtext}>After admin fees</Text>
        </View>

        {/* Total Gain/Loss */}
        <View
          style={[
            styles.summaryCard,
            isPositive ? styles.summaryCardSuccess : styles.summaryCardDanger,
          ]}
        >
          <Text style={styles.summaryCardLabel}>Total Return</Text>
          <Text
            style={
              isPositive
                ? styles.summaryCardValuePositive
                : styles.summaryCardValueNegative
            }
          >
            {formatCurrency(gainLoss)}
          </Text>
          <Text style={styles.summaryCardSubtext}>
            {formatPercent(gainLossPercentage)} overall
          </Text>
        </View>

        {/* Active Investments */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Active Investments</Text>
          <Text style={styles.summaryCardValue}>{activeInvestments}</Text>
          <Text style={styles.summaryCardSubtext}>Investment accounts</Text>
        </View>

        {/* Admin Fees */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Total Admin Fees</Text>
          <Text style={styles.summaryCardValue}>
            {formatCurrency(adminFees)}
          </Text>
          <Text style={styles.summaryCardSubtext}>Platform fees paid</Text>
        </View>

        {/* ROI */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>Return on Investment</Text>
          <Text
            style={
              isPositive
                ? styles.summaryCardValuePositive
                : styles.summaryCardValueNegative
            }
          >
            {formatPercent(gainLossPercentage)}
          </Text>
          <Text style={styles.summaryCardSubtext}>Since inception</Text>
        </View>
      </View>
    </View>
  );
}
