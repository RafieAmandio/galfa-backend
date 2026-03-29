import { View, Text } from "@react-pdf/renderer";
import { slide } from "../slide-styles";
import { SlideLayout } from "./slide-layout";

interface CapitalMarketInvestment {
  performanceDate: Date;
  totalInvested: number;
  grossPerformance: number;
  netPerformance: number;
}

interface CapitalMarketSlideProps {
  investorName: string;
  year: number;
  investments: CapitalMarketInvestment[];
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

function formatPercentage(value: number, total: number): string {
  if (total === 0) return "0.00%";
  return ((value / total) * 100).toFixed(2) + "%";
}

export function CapitalMarketSlide({
  investorName,
  year,
  investments,
  pageNumber,
}: CapitalMarketSlideProps) {
  if (investments.length === 0) return null;

  return (
    <SlideLayout pageNumber={pageNumber}>
      <Text style={slide.cmTitle}>Capital Market Fund Performance</Text>
      <Text style={slide.cmInvestorName}>{investorName}</Text>

      <View style={slide.table}>
        {/* Header */}
        <View style={slide.tableHeader}>
          <View style={[slide.tableHeaderCell, { width: "14%" }]}>
            <Text style={slide.tableHeaderText}>{year}</Text>
          </View>
          <View style={[slide.tableHeaderCell, { width: "16%" }]}>
            <Text style={slide.tableHeaderText}>Total Invested</Text>
          </View>
          <View style={[slide.tableHeaderCell, { width: "18%" }]}>
            <Text style={slide.tableHeaderText}>Gross{"\n"}Performance</Text>
          </View>
          <View style={[slide.tableHeaderCell, { width: "16%" }]}>
            <Text style={slide.tableHeaderText}>
              Gross{"\n"}Performance (%)
            </Text>
          </View>
          <View style={[slide.tableHeaderCell, { width: "18%" }]}>
            <Text style={slide.tableHeaderText}>Net Performance</Text>
          </View>
          <View
            style={[
              slide.tableHeaderCell,
              slide.tableHeaderCellLast,
              { width: "18%" },
            ]}
          >
            <Text style={slide.tableHeaderText}>
              Net Performance{"\n"}(%)
            </Text>
          </View>
        </View>

        {/* Rows */}
        {investments.map((inv, i) => {
          const month = new Date(inv.performanceDate).toLocaleDateString(
            "en-US",
            { month: "long" }
          );
          return (
            <View
              key={i}
              style={[
                slide.tableRow,
                i === investments.length - 1 ? slide.tableRowLast : {},
              ]}
            >
              <View style={[slide.tableCell, { width: "14%" }]}>
                <Text style={slide.tableCellText}>{month}</Text>
              </View>
              <View style={[slide.tableCell, { width: "16%" }]}>
                <Text style={slide.tableCellText}>
                  {formatCurrency(inv.totalInvested)}
                </Text>
              </View>
              <View style={[slide.tableCell, { width: "18%" }]}>
                <Text style={slide.tableCellText}>
                  {formatCurrency(inv.grossPerformance)}
                </Text>
              </View>
              <View style={[slide.tableCell, { width: "16%" }]}>
                <Text style={slide.tableCellText}>
                  {formatPercentage(inv.grossPerformance, inv.totalInvested)}
                </Text>
              </View>
              <View style={[slide.tableCell, { width: "18%" }]}>
                <Text style={slide.tableCellText}>
                  {formatCurrency(inv.netPerformance)}
                </Text>
              </View>
              <View
                style={[
                  slide.tableCell,
                  slide.tableCellLast,
                  { width: "18%" },
                ]}
              >
                <Text style={slide.tableCellText}>
                  {formatPercentage(inv.netPerformance, inv.totalInvested)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </SlideLayout>
  );
}
