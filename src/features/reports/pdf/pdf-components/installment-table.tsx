import { View, Text } from "@react-pdf/renderer";
import { styles, columnWidths, colors } from "../pdf-styles";

interface InstallmentInvestment {
  accountNumber: string;
  grossCapital: number;
  adminFee: number;
  netCapital: number;
  monthlyCof: number;
  durationMonths: number;
  investmentType: "principle" | "interest_only";
  totalRedeemedAmount: number;
}

interface InstallmentTableProps {
  investments: InstallmentInvestment[];
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

export function InstallmentTable({ investments }: InstallmentTableProps) {
  const cols = columnWidths.installment;

  // Calculate totals
  const totals = investments.reduce(
    (acc, inv) => ({
      gross: acc.gross + inv.grossCapital,
      fee: acc.fee + inv.adminFee,
      net: acc.net + inv.netCapital,
      redeemed: acc.redeemed + inv.totalRedeemedAmount,
    }),
    { gross: 0, fee: 0, net: 0, redeemed: 0 }
  );

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.warning }]}>
            <Text style={styles.sectionIconText}>#</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Installment Investments</Text>
            <Text style={styles.sectionSubtitle}>Periodic payment investment accounts</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No installment investments in portfolio</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.warning }]}>
          <Text style={styles.sectionIconText}>#</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Installment Investments</Text>
          <Text style={styles.sectionSubtitle}>
            {investments.length} account{investments.length > 1 ? "s" : ""} with periodic payments
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
          <Text style={[styles.tableHeaderCell, { width: cols.cof }]}>
            COF
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.duration }]}>
            Term
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.type }]}>
            Type
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.redeemed }]}>
            Redeemed
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
              {formatCompactCurrency(investment.netCapital)}
            </Text>
            <Text style={[styles.tableCellBold, { width: cols.cof }]}>
              {(investment.monthlyCof * 100).toFixed(2)}%
            </Text>
            <Text style={[styles.tableCell, { width: cols.duration }]}>
              {investment.durationMonths}mo
            </Text>
            <View style={{ width: cols.type }}>
              <View
                style={[
                  styles.statusBadge,
                  investment.investmentType === "principle"
                    ? { backgroundColor: colors.navy }
                    : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    investment.investmentType === "principle"
                      ? { color: colors.white }
                      : styles.statusBadgeTextInactive,
                  ]}
                >
                  {investment.investmentType === "principle" ? "PRINCIPAL" : "INT ONLY"}
                </Text>
              </View>
            </View>
            <Text style={[styles.tableCellPositive, { width: cols.redeemed }]}>
              {formatCompactCurrency(investment.totalRedeemedAmount)}
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
          <Text style={[styles.tableFooterCell, { width: cols.cof }]}>-</Text>
          <Text style={[styles.tableFooterCell, { width: cols.duration }]}>-</Text>
          <Text style={[styles.tableFooterCell, { width: cols.type }]}>-</Text>
          <Text style={[styles.tableFooterCell, { width: cols.redeemed, color: "#059669" }]}>
            {formatCompactCurrency(totals.redeemed)}
          </Text>
        </View>
      </View>
    </View>
  );
}
