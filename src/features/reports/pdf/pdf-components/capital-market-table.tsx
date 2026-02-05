import { View, Text } from "@react-pdf/renderer";
import { styles, columnWidths } from "../pdf-styles";

interface CapitalMarketInvestment {
  performanceDate: Date;
  totalInvested: number;
  grossPerformance: number;
  netPerformance: number;
}

interface CapitalMarketTableProps {
  investments: CapitalMarketInvestment[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `Rp ${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}M`;
  }
  return formatCurrency(amount);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

export function CapitalMarketTable({ investments }: CapitalMarketTableProps) {
  const cols = columnWidths.capitalMarket;

  // Calculate totals
  const totals = investments.reduce(
    (acc, inv) => ({
      totalInvested: acc.totalInvested + inv.totalInvested,
      grossPerformance: acc.grossPerformance + inv.grossPerformance,
      netPerformance: acc.netPerformance + inv.netPerformance,
    }),
    { totalInvested: 0, grossPerformance: 0, netPerformance: 0 }
  );

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>CM</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Capital Market</Text>
            <Text style={styles.sectionSubtitle}>Market investment performance</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No capital market investments in portfolio</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Text style={styles.sectionIconText}>CM</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Capital Market</Text>
          <Text style={styles.sectionSubtitle}>
            {investments.length} performance record{investments.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: cols.date }]}>
            Period
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.totalInvested }]}>
            Total Invested
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.grossPerformance }]}>
            Gross Performance
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.netPerformance }]}>
            Net Performance
          </Text>
        </View>

        {/* Data Rows */}
        {investments.map((investment, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              index % 2 === 1 ? styles.tableRowAlternate : {},
              index === investments.length - 1 ? styles.tableRowLast : {},
            ]}
          >
            <Text style={[styles.tableCellBold, { width: cols.date }]}>
              {formatDate(investment.performanceDate)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.totalInvested }]}>
              {formatCompactCurrency(investment.totalInvested)}
            </Text>
            <Text
              style={[
                investment.grossPerformance >= 0
                  ? styles.tableCellPositive
                  : styles.tableCellNegative,
                { width: cols.grossPerformance },
              ]}
            >
              {formatCompactCurrency(investment.grossPerformance)}
            </Text>
            <Text
              style={[
                investment.netPerformance >= 0
                  ? styles.tableCellPositive
                  : styles.tableCellNegative,
                { width: cols.netPerformance },
              ]}
            >
              {formatCompactCurrency(investment.netPerformance)}
            </Text>
          </View>
        ))}

        {/* Footer/Totals Row */}
        <View style={styles.tableFooter}>
          <Text style={[styles.tableFooterCell, { width: cols.date }]}>
            TOTAL
          </Text>
          <Text style={[styles.tableFooterCell, { width: cols.totalInvested }]}>
            {formatCompactCurrency(totals.totalInvested)}
          </Text>
          <Text
            style={[
              styles.tableFooterCell,
              { width: cols.grossPerformance, color: totals.grossPerformance >= 0 ? "#059669" : "#dc2626" },
            ]}
          >
            {formatCompactCurrency(totals.grossPerformance)}
          </Text>
          <Text
            style={[
              styles.tableFooterCell,
              { width: cols.netPerformance, color: totals.netPerformance >= 0 ? "#059669" : "#dc2626" },
            ]}
          >
            {formatCompactCurrency(totals.netPerformance)}
          </Text>
        </View>
      </View>
    </View>
  );
}
