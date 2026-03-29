import { View, Text } from "@react-pdf/renderer";
import { slide } from "../slide-styles";
import { SlideLayout } from "./slide-layout";
import type {
  StatementYearData,
  StatementMonthData,
} from "../../actions/get-statement-of-account-data";

interface StatementOfAccountSlideProps {
  investorName: string;
  yearData: StatementYearData;
  hasAnyRedemptions: boolean;
  pageNumber: number;
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

function HalfYearTable({
  year,
  months,
  startMonth,
  showYear,
  hasAnyRedemptions,
}: {
  year: number;
  months: StatementMonthData[];
  startMonth: number;
  showYear: boolean;
  hasAnyRedemptions: boolean;
}) {
  const monthNames =
    startMonth === 0
      ? ["January", "February", "March", "April", "May", "June"]
      : ["July", "August", "September", "October", "November", "December"];

  const monthData = monthNames.map((name) =>
    months.find((m) => m.month === name)
  );

  const hasAnyData = monthData.some((m) => m !== undefined);
  // Always show both tables for completeness (matching real report which shows empty Jul-Dec)

  return (
    <View style={slide.soaTable}>
      {/* Header row */}
      <View style={slide.soaHeaderRow}>
        <View style={slide.soaYearCell}>
          {showYear && <Text style={slide.soaYearText}>{year}</Text>}
        </View>
        {monthNames.map((name) => (
          <View key={name} style={slide.soaMonthCell}>
            <Text style={slide.soaMonthText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Total Invested */}
      <View style={slide.soaDataRow}>
        <View style={slide.soaLabelCell}>
          <Text style={slide.soaLabelText}>Total Invested</Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[slide.soaValueCell, i === 0 ? slide.soaValueCellFirst : {}]}
          >
            <Text style={data ? slide.soaValueText : slide.soaValueEmpty}>
              {data ? formatCurrency(data.totalInvested) : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Total Profit */}
      <View style={slide.soaDataRow}>
        <View style={slide.soaLabelCell}>
          <Text style={slide.soaLabelText}>Total Profit</Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[slide.soaValueCell, i === 0 ? slide.soaValueCellFirst : {}]}
          >
            <Text style={data ? slide.soaValueText : slide.soaValueEmpty}>
              {data ? formatCurrency(data.totalProfit) : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Redeemed (only if any month has redemptions across all years) */}
      {hasAnyRedemptions && (
        <View style={slide.soaDataRow}>
          <View style={slide.soaLabelCell}>
            <Text style={slide.soaLabelText}>Redeemed</Text>
          </View>
          {monthData.map((data, i) => (
            <View
              key={i}
              style={[
                slide.soaValueCell,
                i === 0 ? slide.soaValueCellFirst : {},
              ]}
            >
              <Text
                style={
                  data && data.redeemed > 0
                    ? slide.soaValueText
                    : slide.soaValueEmpty
                }
              >
                {data && data.redeemed > 0
                  ? formatCurrency(data.redeemed)
                  : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Present Value */}
      <View style={slide.soaDataRow}>
        <View style={slide.soaLabelCell}>
          <Text style={slide.soaLabelText}>Present Value</Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[slide.soaValueCell, i === 0 ? slide.soaValueCellFirst : {}]}
          >
            <Text style={data ? slide.soaValueText : slide.soaValueEmpty}>
              {data ? formatCurrency(data.presentValue) : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Profit Ratio */}
      <View style={[slide.soaDataRow, slide.soaDataRowLast]}>
        <View style={slide.soaLabelCell}>
          <Text style={slide.soaLabelText}>
            Total Profit to Total{"\n"}Invested Ratio
          </Text>
        </View>
        {monthData.map((data, i) => (
          <View
            key={i}
            style={[slide.soaValueCell, i === 0 ? slide.soaValueCellFirst : {}]}
          >
            <Text style={data ? slide.soaValueText : slide.soaValueEmpty}>
              {data ? formatPercentage(data.profitRatio) : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StatementOfAccountSlide({
  investorName,
  yearData,
  hasAnyRedemptions,
  pageNumber,
}: StatementOfAccountSlideProps) {
  return (
    <SlideLayout pageNumber={pageNumber}>
      <Text style={slide.sectionTitle}>Statement of Account</Text>
      <Text style={slide.investorName}>{investorName}</Text>

      {/* Jan-Jun */}
      <HalfYearTable
        year={yearData.year}
        months={yearData.months}
        startMonth={0}
        showYear={true}
        hasAnyRedemptions={hasAnyRedemptions}
      />

      {/* Jul-Dec */}
      <HalfYearTable
        year={yearData.year}
        months={yearData.months}
        startMonth={6}
        showYear={false}
        hasAnyRedemptions={hasAnyRedemptions}
      />
    </SlideLayout>
  );
}
