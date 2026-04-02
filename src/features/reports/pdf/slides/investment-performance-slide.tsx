import { View, Text, Svg, Rect, Line, G, Circle, Polyline } from "@react-pdf/renderer";
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

function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(0)}M`;
  }
  return `Rp${amount.toFixed(0)}`;
}

function formatMonth(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatMonthName(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "long" });
}

function formatRoi(value: number | null): string {
  if (value == null) return "-";
  // If value is a whole number like 2, show as "2%", otherwise show decimal
  if (Number.isInteger(value)) return `${value}%`;
  return `${value.toFixed(2)}%`;
}

export function InvestmentPerformanceSlide({
  data,
  pageNumber,
}: InvestmentPerformanceSlideProps) {
  if (data.length === 0) return null;

  // Chart dimensions
  const chartWidth = 380;
  const chartHeight = 200;
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // AUM data
  const maxAum = Math.max(...data.map((d) => d.aum));
  const barCount = data.length;
  const barSpacing = 2;
  const barWidth = Math.min(
    14,
    (graphWidth - barSpacing * (barCount - 1)) / barCount
  );

  // AUM Y-axis scale
  const aumStep = Math.ceil(maxAum / 4 / 1_000_000_000) * 1_000_000_000;
  const aumMax = aumStep * 4;

  const scaleAumY = (value: number) => {
    return paddingTop + graphHeight - (value / aumMax) * graphHeight;
  };

  // ROI Y-axis scale (right axis)
  const roiValues = data
    .map((d) => [d.monthlyGrossRoi, d.monthlyNettRoi])
    .flat()
    .filter((v): v is number => v != null);
  const maxRoi = roiValues.length > 0 ? Math.max(...roiValues) : 3;
  const roiMax = Math.ceil(maxRoi * 1.2 * 100) / 100;

  const scaleRoiY = (value: number) => {
    return paddingTop + graphHeight - (value / roiMax) * graphHeight;
  };

  // AUM Y-axis labels
  const aumLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = (aumMax / 4) * i;
    aumLabels.push({
      value,
      y: scaleAumY(value),
      label: formatCurrencyShort(value),
    });
  }

  // ROI Y-axis labels (right side)
  const roiLabels = [];
  for (let i = 0; i <= 3; i++) {
    const value = (roiMax / 3) * i;
    roiLabels.push({
      value,
      y: scaleRoiY(value),
      label: value.toFixed(2),
    });
  }

  // Generate line points for Gross ROI
  const grossRoiPoints = data
    .map((point, index) => {
      if (point.monthlyGrossRoi == null) return null;
      const totalBarWidth = barWidth + barSpacing;
      const startX =
        paddingLeft +
        (graphWidth - totalBarWidth * barCount + barSpacing) / 2;
      const x = startX + index * totalBarWidth + barWidth / 2;
      const y = scaleRoiY(point.monthlyGrossRoi);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  // Generate line points for Nett ROI
  const nettRoiPoints = data
    .map((point, index) => {
      if (point.monthlyNettRoi == null) return null;
      const totalBarWidth = barWidth + barSpacing;
      const startX =
        paddingLeft +
        (graphWidth - totalBarWidth * barCount + barSpacing) / 2;
      const x = startX + index * totalBarWidth + barWidth / 2;
      const y = scaleRoiY(point.monthlyNettRoi);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  // Get the latest 9 months for the table (matching the reference image)
  const tableData = data.slice(-9);

  return (
    <SlideLayout pageNumber={pageNumber}>
      <Text style={slide.perfTitle}>Investment Performance</Text>
      <Text style={slide.perfSubtitle}>
        Galfa is still on track achieving the target of more than 20% gross
        profit p.a. - more than 10% nett profit for investors.
      </Text>

      <View style={slide.perfChartArea}>
        {/* Chart */}
        <View style={slide.perfChart}>
          <Text
            style={{
              fontSize: 7,
              fontFamily: "Helvetica-Bold",
              color: brand.black,
              marginBottom: 4,
            }}
          >
            Fund Performance
          </Text>

          {/* Legend */}
          <View
            style={{
              flexDirection: "row",
              marginBottom: 4,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: "#9CA3AF",
                  marginRight: 3,
                }}
              />
              <Text style={{ fontSize: 5, color: brand.gray }}>AUM</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 12,
                  height: 2,
                  backgroundColor: brand.navy,
                  marginRight: 3,
                }}
              />
              <Text style={{ fontSize: 5, color: brand.gray }}>
                Monthly Gross ROI
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 12,
                  height: 2,
                  backgroundColor: brand.gold,
                  marginRight: 3,
                }}
              />
              <Text style={{ fontSize: 5, color: brand.gray }}>
                Monthly Nett ROI (Investor)
              </Text>
            </View>
          </View>

          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid lines */}
            <G>
              {aumLabels.map((label, index) => (
                <G key={`grid-${index}`}>
                  <Line
                    x1={paddingLeft}
                    y1={label.y}
                    x2={chartWidth - paddingRight}
                    y2={label.y}
                    stroke="#E5E7EB"
                    strokeWidth={0.5}
                  />
                  <Text
                    x={paddingLeft - 4}
                    y={label.y + 2.5}
                    style={{
                      fontSize: 5,
                      textAnchor: "end",
                      fill: brand.gray,
                    }}
                  >
                    {label.label}
                  </Text>
                </G>
              ))}
            </G>

            {/* Right Y-axis labels (ROI) */}
            <G>
              {roiLabels.map((label, index) => (
                <Text
                  key={`roi-label-${index}`}
                  x={chartWidth - paddingRight + 4}
                  y={label.y + 2.5}
                  style={{
                    fontSize: 5,
                    textAnchor: "start",
                    fill: brand.gray,
                  }}
                >
                  {label.label}
                </Text>
              ))}
            </G>

            {/* X Axis */}
            <Line
              x1={paddingLeft}
              y1={paddingTop + graphHeight}
              x2={chartWidth - paddingRight}
              y2={paddingTop + graphHeight}
              stroke="#D1D5DB"
              strokeWidth={0.5}
            />

            {/* AUM Bars */}
            <G>
              {data.map((point, index) => {
                const barH = Math.max(
                  1,
                  (point.aum / aumMax) * graphHeight
                );
                const totalBarWidth = barWidth + barSpacing;
                const startX =
                  paddingLeft +
                  (graphWidth - totalBarWidth * barCount + barSpacing) / 2;
                const x = startX + index * totalBarWidth;
                const y = paddingTop + graphHeight - barH;

                // Gradient effect: darker bars for more recent data
                const opacity = 0.4 + (index / barCount) * 0.6;
                const gray = Math.round(156 - opacity * 60);
                const fillColor = `rgb(${gray},${gray},${gray + 10})`;

                return (
                  <G key={`bar-${index}`}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={fillColor}
                    />
                    {/* X axis label */}
                    {(index % Math.max(1, Math.floor(barCount / 12)) === 0 ||
                      barCount <= 15) && (
                      <Text
                        x={x + barWidth / 2}
                        y={paddingTop + graphHeight + 10}
                        style={{
                          fontSize: 4,
                          textAnchor: "middle",
                          fill: brand.gray,
                        }}
                      >
                        {formatMonth(point.date)}
                      </Text>
                    )}
                  </G>
                );
              })}
            </G>

            {/* Gross ROI Line (navy/blue) */}
            {grossRoiPoints && (
              <Polyline
                points={grossRoiPoints}
                fill="none"
                stroke={brand.navy}
                strokeWidth={1.5}
              />
            )}

            {/* Nett ROI Line (gold) */}
            {nettRoiPoints && (
              <Polyline
                points={nettRoiPoints}
                fill="none"
                stroke={brand.gold}
                strokeWidth={1.5}
              />
            )}

            {/* Gross ROI dots */}
            {data.map((point, index) => {
              if (point.monthlyGrossRoi == null) return null;
              const totalBarWidth = barWidth + barSpacing;
              const startX =
                paddingLeft +
                (graphWidth - totalBarWidth * barCount + barSpacing) / 2;
              const cx = startX + index * totalBarWidth + barWidth / 2;
              const cy = scaleRoiY(point.monthlyGrossRoi);
              return (
                <Circle
                  key={`gross-dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={1.5}
                  fill={brand.navy}
                />
              );
            })}

            {/* Nett ROI dots */}
            {data.map((point, index) => {
              if (point.monthlyNettRoi == null) return null;
              const totalBarWidth = barWidth + barSpacing;
              const startX =
                paddingLeft +
                (graphWidth - totalBarWidth * barCount + barSpacing) / 2;
              const cx = startX + index * totalBarWidth + barWidth / 2;
              const cy = scaleRoiY(point.monthlyNettRoi);
              return (
                <Circle
                  key={`nett-dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={1.5}
                  fill={brand.gold}
                />
              );
            })}
          </Svg>
        </View>

        {/* Monthly Data Table */}
        <View style={slide.perfInfoBox}>
          <View style={slide.table}>
            {/* Header */}
            <View style={slide.tableHeader}>
              <View style={[slide.tableHeaderCell, { width: "28%" }]}>
                <Text style={slide.tableHeaderText}></Text>
              </View>
              <View style={[slide.tableHeaderCell, { width: "32%" }]}>
                <Text style={slide.tableHeaderText}>AUM{"\n"}(Mio IDR)</Text>
              </View>
              <View style={[slide.tableHeaderCell, { width: "20%" }]}>
                <Text style={slide.tableHeaderText}>
                  Gross ROI{"\n"}(%)
                </Text>
              </View>
              <View
                style={[
                  slide.tableHeaderCell,
                  slide.tableHeaderCellLast,
                  { width: "20%" },
                ]}
              >
                <Text style={slide.tableHeaderText}>
                  Nett ROI{"\n"}(100%)
                </Text>
              </View>
            </View>

            {/* Data rows */}
            {tableData.map((point, i) => {
              const isLast = i === tableData.length - 1;
              return (
                <View
                  key={i}
                  style={[slide.tableRow, isLast && slide.tableRowLast]}
                >
                  <View style={[slide.tableCell, { width: "28%" }]}>
                    <Text style={slide.tableCellTextBold}>
                      {formatMonthName(point.date)}
                    </Text>
                  </View>
                  <View style={[slide.tableCell, { width: "32%" }]}>
                    <Text style={slide.tableCellText}>
                      {formatCurrencyFull(point.aum)}
                    </Text>
                  </View>
                  <View style={[slide.tableCell, { width: "20%" }]}>
                    <Text style={slide.tableCellText}>
                      {formatRoi(point.monthlyGrossRoi)}
                    </Text>
                  </View>
                  <View
                    style={[
                      slide.tableCell,
                      slide.tableCellLast,
                      { width: "20%" },
                    ]}
                  >
                    <Text
                      style={[
                        slide.tableCellText,
                        { fontFamily: "Helvetica-Bold" },
                      ]}
                    >
                      {formatRoi(point.monthlyNettRoi)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </SlideLayout>
  );
}
