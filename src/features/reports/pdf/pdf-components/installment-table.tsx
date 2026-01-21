import { View, Text } from "@react-pdf/renderer";
import { styles, columnWidths } from "../pdf-styles";

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

export function InstallmentTable({ investments }: InstallmentTableProps) {
  const cols = columnWidths.installment;

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Installment Investments</Text>
        <Text style={styles.noData}>No installment investments found</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Installment Investments</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: cols.accountNumber }]}>
            Account #
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.gross }]}>
            Gross
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.fee }]}>Fee</Text>
          <Text style={[styles.tableHeaderCell, { width: cols.net }]}>Net</Text>
          <Text style={[styles.tableHeaderCell, { width: cols.cof }]}>COF</Text>
          <Text style={[styles.tableHeaderCell, { width: cols.duration }]}>
            Duration
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.type }]}>
            Type
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.redeemed }]}>
            Redeemed
          </Text>
        </View>
        {investments.map((investment, index) => (
          <View
            key={investment.accountNumber}
            style={[
              styles.tableRow,
              index % 2 === 1 ? styles.tableRowAlternate : {},
            ]}
          >
            <Text style={[styles.tableCell, { width: cols.accountNumber }]}>
              {investment.accountNumber}
            </Text>
            <Text style={[styles.tableCell, { width: cols.gross }]}>
              {formatCurrency(investment.grossCapital)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.fee }]}>
              {formatCurrency(investment.adminFee)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.net }]}>
              {formatCurrency(investment.netCapital)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.cof }]}>
              {(investment.monthlyCof * 100).toFixed(2)}%
            </Text>
            <Text style={[styles.tableCell, { width: cols.duration }]}>
              {investment.durationMonths}mo
            </Text>
            <Text style={[styles.tableCell, { width: cols.type }]}>
              {investment.investmentType === "principle"
                ? "Principal"
                : "Interest Only"}
            </Text>
            <Text style={[styles.tableCell, { width: cols.redeemed }]}>
              {formatCurrency(investment.totalRedeemedAmount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
