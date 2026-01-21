import { View, Text, Svg, Rect, Line, G } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import type { VCPerformanceDataPoint } from "../../actions/get-report-data";

interface PerformanceChartProps {
  data: VCPerformanceDataPoint[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
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
        <Text style={styles.sectionTitle}>Company Performance</Text>
        <Text style={styles.noData}>No performance data available</Text>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = 500;
  const chartHeight = 150;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Calculate data ranges
  const maxAum = Math.max(...data.map((d) => d.aum));
  const minAum = Math.min(...data.map((d) => d.aum));
  const aumRange = maxAum - minAum || maxAum; // Prevent division by zero
  const aumPadding = aumRange * 0.1;
  const adjustedMinAum = Math.max(0, minAum - aumPadding);
  const adjustedMaxAum = maxAum + aumPadding;
  const adjustedRange = adjustedMaxAum - adjustedMinAum;

  // Bar width calculation
  const barCount = data.length;
  const barSpacing = 8;
  const barWidth = (graphWidth - barSpacing * (barCount - 1)) / barCount;

  // Scale function for Y axis (AUM)
  const scaleY = (value: number) => {
    const normalized = (value - adjustedMinAum) / adjustedRange;
    return graphHeight - normalized * graphHeight;
  };

  // Calculate Y axis labels (5 labels)
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = adjustedMinAum + (adjustedRange * i) / 4;
    yLabels.push({
      value,
      y: scaleY(value) + paddingTop,
      label: formatCurrency(value),
    });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Company Performance (AUM)</Text>

      <Svg width={chartWidth} height={chartHeight}>
        {/* Y Axis */}
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={chartHeight - paddingBottom}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* X Axis */}
        <Line
          x1={paddingLeft}
          y1={chartHeight - paddingBottom}
          x2={chartWidth - paddingRight}
          y2={chartHeight - paddingBottom}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Grid lines and Y axis labels */}
        <G>
          {yLabels.map((label, index) => (
            <G key={`grid-${index}`}>
              <Line
                x1={paddingLeft}
                y1={label.y}
                x2={chartWidth - paddingRight}
                y2={label.y}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <Text
                x={paddingLeft - 5}
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

        {/* Bars */}
        <G>
          {data.map((point, index) => {
            const barHeight = (point.aum - adjustedMinAum) / adjustedRange * graphHeight;
            const x = paddingLeft + index * (barWidth + barSpacing);
            const y = chartHeight - paddingBottom - barHeight;

            return (
              <G key={`bar-${index}`}>
                {/* Bar */}
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colors.primary}
                  rx={2}
                />

                {/* X axis label (month) */}
                <Text
                  x={x + barWidth / 2}
                  y={chartHeight - paddingBottom + 12}
                  style={{
                    fontSize: 6,
                    textAnchor: "middle",
                    fill: colors.textMuted,
                  }}
                >
                  {formatMonth(point.date)}
                </Text>
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Legend and summary */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
          paddingHorizontal: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: colors.primary,
              marginRight: 5,
              borderRadius: 2,
            }}
          />
          <Text style={{ fontSize: 8, color: colors.textMuted }}>
            Assets Under Management (AUM)
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>
            Latest AUM: IDR {formatCurrency(data[data.length - 1]?.aum || 0)}
          </Text>
          <Text style={{ fontSize: 8, color: colors.textMuted }}>
            Period: {data.length} months
          </Text>
        </View>
      </View>
    </View>
  );
}
