import { View, Text } from "@react-pdf/renderer";
import { styles, columnWidths } from "../pdf-styles";

interface FlatRateInvestment {
  accountNumber: string;
  grossInvestedAmount: number;
  adminFee: number;
  netInvestedAmount: number;
  annualRate: number;
  startDate: Date;
  endDate: Date | null;
  currentValue: number;
  gainLoss: number;
}

interface FlatRateTableProps {
  investments: FlatRateInvestment[];
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

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FlatRateTable({ investments }: FlatRateTableProps) {
  const cols = columnWidths.flatRate;

  // Calculate totals
  const totals = investments.reduce(
    (acc, inv) => ({
      gross: acc.gross + inv.grossInvestedAmount,
      fee: acc.fee + inv.adminFee,
      net: acc.net + inv.netInvestedAmount,
      npv: acc.npv + inv.currentValue,
      gainLoss: acc.gainLoss + inv.gainLoss,
    }),
    { gross: 0, fee: 0, net: 0, npv: 0, gainLoss: 0 }
  );

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>%</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Flat Rate Investments</Text>
            <Text style={styles.sectionSubtitle}>Fixed return investment accounts</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No flat rate investments in portfolio</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Text style={styles.sectionIconText}>%</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Flat Rate Investments</Text>
          <Text style={styles.sectionSubtitle}>
            {investments.length} account{investments.length > 1 ? "s" : ""} with fixed returns
          </Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: cols.accountNumber }]}>
            Account
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.gross }]}>
            Gross
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.fee }]}>
            Fee
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.net }]}>
            Net
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.rate }]}>
            Rate
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.startDate }]}>
            Start
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.endDate }]}>
            End
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.npv }]}>
            Value
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.gainLoss }]}>
            Return
          </Text>
        </View>

        {/* Data Rows */}
        {investments.map((investment, index) => (
          <View
            key={investment.accountNumber}
            style={[
              styles.tableRow,
              index % 2 === 1 ? styles.tableRowAlternate : {},
              index === investments.length - 1 ? styles.tableRowLast : {},
            ]}
          >
            <Text style={[styles.tableCellBold, { width: cols.accountNumber }]}>
              {investment.accountNumber}
            </Text>
            <Text style={[styles.tableCell, { width: cols.gross }]}>
              {formatCompactCurrency(investment.grossInvestedAmount)}
            </Text>
            <Text style={[styles.tableCellMuted, { width: cols.fee }]}>
              {formatCompactCurrency(investment.adminFee)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.net }]}>
              {formatCompactCurrency(investment.netInvestedAmount)}
            </Text>
            <Text style={[styles.tableCellBold, { width: cols.rate }]}>
              {(investment.annualRate * 100).toFixed(1)}%
            </Text>
            <Text style={[styles.tableCellMuted, { width: cols.startDate }]}>
              {formatDate(investment.startDate)}
            </Text>
            <Text style={[styles.tableCellMuted, { width: cols.endDate }]}>
              {formatDate(investment.endDate)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.npv }]}>
              {formatCompactCurrency(investment.currentValue)}
            </Text>
            <Text
              style={[
                investment.gainLoss >= 0
                  ? styles.tableCellPositive
                  : styles.tableCellNegative,
                { width: cols.gainLoss },
              ]}
            >
              {formatCompactCurrency(investment.gainLoss)}
            </Text>
          </View>
        ))}

        {/* Footer/Totals Row */}
        <View style={styles.tableFooter}>
          <Text style={[styles.tableFooterCell, { width: cols.accountNumber }]}>
            TOTAL
          </Text>
          <Text style={[styles.tableFooterCell, { width: cols.gross }]}>
            {formatCompactCurrency(totals.gross)}
          </Text>
          <Text style={[styles.tableFooterCell, { width: cols.fee }]}>
            {formatCompactCurrency(totals.fee)}
          </Text>
          <Text style={[styles.tableFooterCell, { width: cols.net }]}>
            {formatCompactCurrency(totals.net)}
          </Text>
          <Text style={[styles.tableFooterCell, { width: cols.rate }]}>-</Text>
          <Text style={[styles.tableFooterCell, { width: cols.startDate }]}>-</Text>
          <Text style={[styles.tableFooterCell, { width: cols.endDate }]}>-</Text>
          <Text style={[styles.tableFooterCell, { width: cols.npv }]}>
            {formatCompactCurrency(totals.npv)}
          </Text>
          <Text
            style={[
              styles.tableFooterCell,
              { width: cols.gainLoss, color: totals.gainLoss >= 0 ? "#059669" : "#dc2626" },
            ]}
          >
            {formatCompactCurrency(totals.gainLoss)}
          </Text>
        </View>
      </View>
    </View>
  );
}
