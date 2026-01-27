import { View, Text, Svg, Rect, Line, G } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import type { VCPerformanceDataPoint } from "../../actions/get-report-data";

interface PerformanceChartProps {
  data: VCPerformanceDataPoint[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(1)}K`;
  }
  return `Rp ${amount.toFixed(0)}`;
}

function formatMonth(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(date);
  return months[d.getMonth()];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.gold }]}>
            <Text style={[styles.sectionIconText, { color: colors.navy }]}>^</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Company Performance</Text>
            <Text style={styles.sectionSubtitle}>Historical AUM performance data</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No performance data available</Text>
        </View>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = 500;
  const chartHeight = 140;
  const paddingLeft = 65;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Calculate data ranges
  const maxAum = Math.max(...data.map((d) => d.aum));
  const minAum = Math.min(...data.map((d) => d.aum));
  const aumRange = maxAum - minAum || maxAum;
  const aumPadding = aumRange * 0.1;
  const adjustedMinAum = Math.max(0, minAum - aumPadding);
  const adjustedMaxAum = maxAum + aumPadding;
  const adjustedRange = adjustedMaxAum - adjustedMinAum;

  // Bar width calculation
  const barCount = data.length;
  const barSpacing = 6;
  const barWidth = Math.min(40, (graphWidth - barSpacing * (barCount - 1)) / barCount);

  // Scale function for Y axis (AUM)
  const scaleY = (value: number) => {
    const normalized = (value - adjustedMinAum) / adjustedRange;
    return graphHeight - normalized * graphHeight;
  };

  // Calculate Y axis labels (4 labels)
  const yLabels = [];
  for (let i = 0; i <= 3; i++) {
    const value = adjustedMinAum + (adjustedRange * i) / 3;
    yLabels.push({
      value,
      y: scaleY(value) + paddingTop,
      label: formatCurrency(value),
    });
  }

  // Calculate growth
  const firstAum = data[0]?.aum || 0;
  const lastAum = data[data.length - 1]?.aum || 0;
  const growth = firstAum > 0 ? ((lastAum - firstAum) / firstAum) * 100 : 0;
  const isPositiveGrowth = growth >= 0;

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.gold }]}>
          <Text style={[styles.sectionIconText, { color: colors.navy }]}>^</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Company Performance</Text>
          <Text style={styles.sectionSubtitle}>
            Historical AUM performance over {data.length} month{data.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Chart Container */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Background grid lines */}
          <G>
            {yLabels.map((label, index) => (
              <G key={`grid-${index}`}>
                <Line
                  x1={paddingLeft}
                  y1={label.y}
                  x2={chartWidth - paddingRight}
                  y2={label.y}
                  stroke={colors.borderLight}
                  strokeWidth={1}
                />
                <Text
                  x={paddingLeft - 8}
                  y={label.y + 3}
                  style={{
                    fontSize: 7,
                    textAnchor: "end",
                    fill: colors.textMuted,
                  }}
                >
                  {label.label}
                </Text>
              </G>
            ))}
          </G>

          {/* X Axis */}
          <Line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={chartWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            stroke={colors.border}
            strokeWidth={1}
          />

          {/* Bars */}
          <G>
            {data.map((point, index) => {
              const barHeight = Math.max(2, (point.aum - adjustedMinAum) / adjustedRange * graphHeight);
              const totalBarWidth = barWidth + barSpacing;
              const startX = paddingLeft + (graphWidth - totalBarWidth * barCount + barSpacing) / 2;
              const x = startX + index * totalBarWidth;
              const y = chartHeight - paddingBottom - barHeight;

              return (
                <G key={`bar-${index}`}>
                  {/* Bar */}
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={colors.navy}
                    rx={3}
                  />

                  {/* X axis label (month) */}
                  <Text
                    x={x + barWidth / 2}
                    y={chartHeight - paddingBottom + 12}
                    style={{
                      fontSize: 7,
                      textAnchor: "middle",
                      fill: colors.textSecondary,
                    }}
                  >
                    {formatMonth(point.date)}
                  </Text>
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Summary Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: colors.navy,
                marginRight: 8,
                borderRadius: 2,
              }}
            />
            <Text style={{ fontSize: 8, color: colors.textSecondary }}>
              Assets Under Management (AUM)
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ alignItems: "flex-end", marginRight: 20 }}>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>Latest AUM</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.text }}>
                {formatCurrency(lastAum)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>Period Growth</Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  color: isPositiveGrowth ? colors.success : colors.danger,
                }}
              >
                {isPositiveGrowth ? "+" : ""}{growth.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
