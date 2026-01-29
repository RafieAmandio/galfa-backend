import { View, Text } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import type { FundAllocationData } from "../../actions/get-report-data";

interface FundAllocationsTableProps {
  allocations: FundAllocationData[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(2)}M`;
  }
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

const columnWidths = {
  name: "25%",
  description: "35%",
  aum: "20%",
  rate: "20%",
};

export function FundAllocationsTable({ allocations }: FundAllocationsTableProps) {
  if (!allocations || allocations.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.navy }]}>
            <Text style={[styles.sectionIconText, { color: colors.white }]}>A</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Fund Allocations</Text>
            <Text style={styles.sectionSubtitle}>Portfolio company allocations</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No fund allocation data available</Text>
        </View>
      </View>
    );
  }

  const totalAum = allocations.reduce((sum, a) => sum + a.aum, 0);

  return (
    <View style={styles.section} break>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.navy }]}>
          <Text style={[styles.sectionIconText, { color: colors.white }]}>A</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Fund Allocations</Text>
          <Text style={styles.sectionSubtitle}>
            Portfolio company allocations - Most funds used for bridging loans at 1%-3% p.m.
          </Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: columnWidths.name }]}>
            Allocation
          </Text>
          <Text style={[styles.tableHeaderCell, { width: columnWidths.description }]}>
            Description
          </Text>
          <Text style={[styles.tableHeaderCell, { width: columnWidths.aum, textAlign: "right" }]}>
            AUM
          </Text>
          <Text style={[styles.tableHeaderCell, { width: columnWidths.rate, textAlign: "right" }]}>
            Rate
          </Text>
        </View>

        {/* Table Body */}
        {allocations.map((allocation, index) => (
          <View
            key={allocation.id}
            style={[
              styles.tableRow,
              index % 2 === 1 && styles.tableRowAlternate,
              index === allocations.length - 1 && styles.tableRowLast,
            ]}
          >
            <Text style={[styles.tableCellBold, { width: columnWidths.name }]}>
              {allocation.name}
            </Text>
            <Text style={[styles.tableCellMuted, { width: columnWidths.description }]}>
              {allocation.description
                ? allocation.description.length > 80
                  ? allocation.description.substring(0, 80) + "..."
                  : allocation.description
                : "-"}
            </Text>
            <Text style={[styles.tableCell, { width: columnWidths.aum, textAlign: "right" }]}>
              {formatCurrency(allocation.aum)}
            </Text>
            <View style={{ width: columnWidths.rate, alignItems: "flex-end" }}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      allocation.rateType === "loan" ? colors.navyLight + "20" : colors.successLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: allocation.rateType === "loan" ? colors.navy : colors.success,
                    },
                  ]}
                >
                  {allocation.rateLabel ||
                    `${allocation.rateType === "loan" ? "Loan" : "ROE"}: ${allocation.rateValue}%`}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Table Footer - Totals */}
        <View style={styles.tableFooter}>
          <Text style={[styles.tableFooterCell, { width: columnWidths.name }]}>
            Total ({allocations.length} companies)
          </Text>
          <Text style={[styles.tableFooterCell, { width: columnWidths.description }]}></Text>
          <Text
            style={[styles.tableFooterCell, { width: columnWidths.aum, textAlign: "right" }]}
          >
            {formatCurrency(totalAum)}
          </Text>
          <Text style={[styles.tableFooterCell, { width: columnWidths.rate }]}></Text>
        </View>
      </View>
    </View>
  );
}
