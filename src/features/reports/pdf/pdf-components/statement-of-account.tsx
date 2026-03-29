import { View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { colors } from "../pdf-styles";
import type {
  StatementOfAccountData,
  StatementYearData,
  StatementMonthData,
} from "../../actions/get-statement-of-account-data";

interface StatementOfAccountProps {
  data: StatementOfAccountData;
}

function formatCurrency(amount: number): string {
  return (
    "Rp" +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount))
  );
}

function formatPercentage(value: number): string {
  return value.toFixed(2) + "%";
}

const s = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    backgroundColor: colors.success,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionIconText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Statement header
  statementTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.gold,
    marginBottom: 2,
  },
  investorName: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.navy,
    marginBottom: 12,
  },

  // Year block
  yearBlock: {
    marginBottom: 16,
  },

  // Table
  table: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Year + month header row
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  yearCell: {
    width: "16%",
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  yearText: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
  },
  monthHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  monthHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.text,
  },

  // Data rows
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    width: "16%",
    paddingVertical: 5,
    paddingHorizontal: 6,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  rowLabelText: {
    fontSize: 7.5,
    color: colors.text,
  },
  dataCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  dataCellFirst: {
    borderLeftWidth: 0,
  },
  dataCellText: {
    fontSize: 7,
    color: colors.text,
  },
  dataCellTextBold: {
    fontSize: 7,
    color: colors.text,
    fontWeight: "bold",
  },
  dataCellEmpty: {
    fontSize: 7,
    color: colors.textMuted,
  },
});

function HalfYearTable({
  year,
  months,
  startMonth,
  showYear,
  hasAnyRedemptions,
}: {
  year: number;
  months: StatementMonthData[];
  startMonth: number; // 0 for Jan, 6 for Jul
  showYear: boolean;
  hasAnyRedemptions: boolean;
}) {
  const monthNames =
    startMonth === 0
      ? ["January", "February", "March", "April", "May", "June"]
      : ["July", "August", "September", "October", "November", "December"];

  // Get data for each month slot
  const monthData = monthNames.map((name) =>
    months.find((m) => m.month === name)
  );

  // Check if any month in this half has data
  const hasAnyData = monthData.some((m) => m !== undefined);
  if (!hasAnyData) return null;

  return (
    <View style={s.table}>
      {/* Header row with year and month names */}
      <View style={s.headerRow}>
        <View style={s.yearCell}>
          {showYear && <Text style={s.yearText}>{year}</Text>}
        </View>
        {monthNames.map((name) => (
          <View key={name} style={s.monthHeaderCell}>
            <Text style={s.monthHeaderText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Total Invested row */}
      <View style={s.dataRow}>
        <View style={s.rowLabel}>
          <Text style={s.rowLabelText}>Total Invested</Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[s.dataCell, i === 0 ? s.dataCellFirst : {}]}
          >
            <Text style={data ? s.dataCellText : s.dataCellEmpty}>
              {data ? formatCurrency(data.totalInvested) : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Total Profit row */}
      <View style={s.dataRow}>
        <View style={s.rowLabel}>
          <Text style={s.rowLabelText}>Total Profit</Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[s.dataCell, i === 0 ? s.dataCellFirst : {}]}
          >
            <Text style={data ? s.dataCellText : s.dataCellEmpty}>
              {data ? formatCurrency(data.totalProfit) : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Redeemed row - only shown if any month has redemptions */}
      {hasAnyRedemptions && (
        <View style={s.dataRow}>
          <View style={s.rowLabel}>
            <Text style={s.rowLabelText}>Redeemed</Text>
          </View>
          {monthData.map((data, i) => (
            <View
              key={i}
              style={[s.dataCell, i === 0 ? s.dataCellFirst : {}]}
            >
              <Text style={data && data.redeemed > 0 ? s.dataCellText : s.dataCellEmpty}>
                {data && data.redeemed > 0
                  ? formatCurrency(data.redeemed)
                  : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Present Value row */}
      <View style={s.dataRow}>
        <View style={s.rowLabel}>
          <Text style={s.rowLabelText}>Present Value</Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[s.dataCell, i === 0 ? s.dataCellFirst : {}]}
          >
            <Text style={data ? s.dataCellTextBold : s.dataCellEmpty}>
              {data ? formatCurrency(data.presentValue) : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Profit Ratio row */}
      <View style={[s.dataRow, s.dataRowLast]}>
        <View style={s.rowLabel}>
          <Text style={s.rowLabelText}>
            Total Profit to Total{"\n"}Invested Ratio
          </Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[s.dataCell, i === 0 ? s.dataCellFirst : {}]}
          >
            <Text style={data ? s.dataCellTextBold : s.dataCellEmpty}>
              {data ? formatPercentage(data.profitRatio) : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StatementOfAccount({ data }: StatementOfAccountProps) {
  if (data.years.length === 0) {
    return null;
  }

  // Check if any year has redemptions
  const hasAnyRedemptions = data.years.some((year) =>
    year.months.some((m) => m.redeemed > 0)
  );

  return (
    <View style={s.section} break>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <View style={s.sectionIcon}>
          <Text style={s.sectionIconText}>~</Text>
        </View>
        <View>
          <Text style={s.sectionTitle}>Statement of Account</Text>
          <Text style={s.sectionSubtitle}>
            Monthly floating rate investment performance
          </Text>
        </View>
      </View>

      {/* Statement title and investor name */}
      <Text style={s.statementTitle}>Statement of Account</Text>
      <Text style={s.investorName}>{data.investorName}</Text>

      {/* Year blocks */}
      {data.years.map((yearData) => {
        // Check if this year has redemptions
        const yearHasRedemptions = hasAnyRedemptions;

        return (
          <View key={yearData.year} style={s.yearBlock}>
            {/* Jan-Jun table */}
            <HalfYearTable
              year={yearData.year}
              months={yearData.months}
              startMonth={0}
              showYear={true}
              hasAnyRedemptions={yearHasRedemptions}
            />

            {/* Jul-Dec table */}
            <HalfYearTable
              year={yearData.year}
              months={yearData.months}
              startMonth={6}
              showYear={false}
              hasAnyRedemptions={yearHasRedemptions}
            />
          </View>
        );
      })}
    </View>
  );
}
