import { View, Text } from "@react-pdf/renderer";
import { styles, columnWidths, colors } from "../pdf-styles";

interface FloatingRateInvestment {
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netInvestorFund: number;
  presentValueFund: number;
  gainedFund: number;
  status: string;
}

interface FloatingRateTableProps {
  investments: FloatingRateInvestment[];
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

export function FloatingRateTable({ investments }: FloatingRateTableProps) {
  const cols = columnWidths.floatingRate;

  // Calculate totals
  const totals = investments.reduce(
    (acc, inv) => ({
      gross: acc.gross + inv.grossCapital,
      fee: acc.fee + inv.adminFee,
      net: acc.net + inv.netInvestorFund,
      presentValue: acc.presentValue + inv.presentValueFund,
      gained: acc.gained + inv.gainedFund,
    }),
    { gross: 0, fee: 0, net: 0, presentValue: 0, gained: 0 }
  );

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.success }]}>
            <Text style={styles.sectionIconText}>~</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Floating Rate Investments</Text>
            <Text style={styles.sectionSubtitle}>Variable return investment accounts</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No floating rate investments in portfolio</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.success }]}>
          <Text style={styles.sectionIconText}>~</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Floating Rate Investments</Text>
          <Text style={styles.sectionSubtitle}>
            {investments.length} account{investments.length > 1 ? "s" : ""} with variable returns
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
          <Text style={[styles.tableHeaderCell, { width: cols.presentValue }]}>
            Value
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.gained }]}>
            Gained
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.status }]}>
            Status
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
              {formatCompactCurrency(investment.grossCapital)}
            </Text>
            <Text style={[styles.tableCellMuted, { width: cols.fee }]}>
              {formatCompactCurrency(investment.adminFee)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.net }]}>
              {formatCompactCurrency(investment.netInvestorFund)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.presentValue }]}>
              {formatCompactCurrency(investment.presentValueFund)}
            </Text>
            <Text
              style={[
                investment.gainedFund >= 0
                  ? styles.tableCellPositive
                  : styles.tableCellNegative,
                { width: cols.gained },
              ]}
            >
              {formatCompactCurrency(investment.gainedFund)}
            </Text>
            <View style={{ width: cols.status }}>
              <View
                style={[
                  styles.statusBadge,
                  investment.status === "active"
                    ? styles.statusBadgeActive
                    : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    investment.status === "active"
                      ? styles.statusBadgeTextActive
                      : styles.statusBadgeTextInactive,
                  ]}
                >
                  {investment.status.toUpperCase()}
                </Text>
              </View>
            </View>
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
          <Text style={[styles.tableFooterCell, { width: cols.presentValue }]}>
            {formatCompactCurrency(totals.presentValue)}
          </Text>
          <Text
            style={[
              styles.tableFooterCell,
              { width: cols.gained, color: totals.gained >= 0 ? "#059669" : "#dc2626" },
            ]}
          >
            {formatCompactCurrency(totals.gained)}
          </Text>
          <Text style={[styles.tableFooterCell, { width: cols.status }]}>-</Text>
        </View>
      </View>
    </View>
  );
}
