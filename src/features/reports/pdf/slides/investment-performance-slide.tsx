import { View, Text } from "@react-pdf/renderer";
import { slide, brand } from "../slide-styles";
import { SlideLayout } from "./slide-layout";
import type { VCPerformanceDataPoint } from "../../actions/get-report-data";

interface InvestmentPerformanceSlideProps {
  data: VCPerformanceDataPoint[];
  pageNumber: number;
}

function formatCurrencyFull(amount: number): string {
  return (
    "Rp" +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount))
  );
}

function formatMonth(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function InvestmentPerformanceSlide({
  data,
  pageNumber,
}: InvestmentPerformanceSlideProps) {
  if (data.length === 0) return null;

  const latest = data[data.length - 1];
  const maxAum = Math.max(...data.map((d) => d.aum));

  // Calculate ROI
  const first = data[0];
  const grossRoi =
    first.aum > 0 ? ((latest.aum - first.aum) / first.aum) * 100 : 0;
  // Approximate net ROI (investor gets ~half of gross, simplified)
  const netRoi = grossRoi > 0 ? grossRoi * 0.5 : 0;

  const latestMonth = new Date(latest.date).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <SlideLayout pageNumber={pageNumber}>
      <Text style={slide.perfTitle}>Investment Performance</Text>
      <Text style={slide.perfSubtitle}>
        Galfa is still on track achieving the target of more than 20% gross
        profit p.a. - more than 10% nett profit for investors.
      </Text>

      <View style={slide.perfChartArea}>
        {/* Bar chart */}
        <View style={slide.perfChart}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 180 }}>
            {data.map((point, i) => {
              const barHeight = maxAum > 0 ? (point.aum / maxAum) * 160 : 0;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginHorizontal: 1,
                  }}
                >
                  <View
                    style={{
                      width: "80%",
                      height: barHeight,
                      backgroundColor: brand.navy,
                    }}
                  />
                </View>
              );
            })}
          </View>
          {/* Month labels */}
          <View style={{ flexDirection: "row", marginTop: 3 }}>
            {data.map((point, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 4.5, color: brand.gray }}>
                  {formatMonth(point.date)}
                </Text>
              </View>
            ))}
          </View>
          {/* Legend */}
          <View style={{ flexDirection: "row", marginTop: 6, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: brand.navy,
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 6, color: brand.gray }}>AUM</Text>
            </View>
          </View>
        </View>

        {/* Info table */}
        <View style={slide.perfInfoBox}>
          <View style={slide.table}>
            {/* Header */}
            <View style={slide.tableHeader}>
              <View style={[slide.tableHeaderCell, { width: "30%" }]}>
                <Text style={slide.tableHeaderText}></Text>
              </View>
              <View style={[slide.tableHeaderCell, { width: "35%" }]}>
                <Text style={slide.tableHeaderText}>AUM{"\n"}(Mio IDR)</Text>
              </View>
              <View style={[slide.tableHeaderCell, { width: "17%" }]}>
                <Text style={slide.tableHeaderText}>Gross ROI{"\n"}(%)</Text>
              </View>
              <View
                style={[
                  slide.tableHeaderCell,
                  slide.tableHeaderCellLast,
                  { width: "18%" },
                ]}
              >
                <Text style={slide.tableHeaderText}>Nett ROI{"\n"}(100%)</Text>
              </View>
            </View>
            {/* Data row */}
            <View style={[slide.tableRow, slide.tableRowLast]}>
              <View style={[slide.tableCell, { width: "30%" }]}>
                <Text style={slide.tableCellTextBold}>{latestMonth}</Text>
              </View>
              <View style={[slide.tableCell, { width: "35%" }]}>
                <Text style={slide.tableCellText}>
                  {formatCurrencyFull(latest.aum)}
                </Text>
              </View>
              <View style={[slide.tableCell, { width: "17%" }]}>
                <Text style={slide.tableCellText}>
                  {grossRoi.toFixed(0)}%
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
                  {netRoi.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SlideLayout>
  );
}
