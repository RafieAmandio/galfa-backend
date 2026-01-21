import { View, Text } from "@react-pdf/renderer";
import { styles, columnWidths } from "../pdf-styles";

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

export function FloatingRateTable({ investments }: FloatingRateTableProps) {
  const cols = columnWidths.floatingRate;

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Floating Rate Investments</Text>
        <Text style={styles.noData}>No floating rate investments found</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Floating Rate Investments</Text>
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
          <Text style={[styles.tableHeaderCell, { width: cols.presentValue }]}>
            Present Value
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.gained }]}>
            Gained
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.status }]}>
            Status
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
              {formatCurrency(investment.netInvestorFund)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.presentValue }]}>
              {formatCurrency(investment.presentValueFund)}
            </Text>
            <Text
              style={[
                investment.gainedFund >= 0
                  ? styles.tableCellPositive
                  : styles.tableCellNegative,
                { width: cols.gained },
              ]}
            >
              {formatCurrency(investment.gainedFund)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.status }]}>
              {investment.status}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
