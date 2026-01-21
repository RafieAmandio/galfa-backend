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

  if (investments.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Flat Rate Investments</Text>
        <Text style={styles.noData}>No flat rate investments found</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Flat Rate Investments</Text>
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
          <Text style={[styles.tableHeaderCell, { width: cols.rate }]}>
            Rate
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.startDate }]}>
            Start
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.endDate }]}>
            End
          </Text>
          <Text style={[styles.tableHeaderCell, { width: cols.npv }]}>NPV</Text>
          <Text style={[styles.tableHeaderCell, { width: cols.gainLoss }]}>
            Gain/Loss
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
              {formatCurrency(investment.grossInvestedAmount)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.fee }]}>
              {formatCurrency(investment.adminFee)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.net }]}>
              {formatCurrency(investment.netInvestedAmount)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.rate }]}>
              {(investment.annualRate * 100).toFixed(1)}%
            </Text>
            <Text style={[styles.tableCell, { width: cols.startDate }]}>
              {formatDate(investment.startDate)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.endDate }]}>
              {formatDate(investment.endDate)}
            </Text>
            <Text style={[styles.tableCell, { width: cols.npv }]}>
              {formatCurrency(investment.currentValue)}
            </Text>
            <Text
              style={[
                investment.gainLoss >= 0
                  ? styles.tableCellPositive
                  : styles.tableCellNegative,
                { width: cols.gainLoss },
              ]}
            >
              {formatCurrency(investment.gainLoss)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
