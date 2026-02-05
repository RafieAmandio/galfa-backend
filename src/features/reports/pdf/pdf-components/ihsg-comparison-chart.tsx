import { View, Text, Svg, Line, G, Circle, Rect } from "@react-pdf/renderer";
import { styles, colors } from "../pdf-styles";
import type { VCPerformanceDataPoint } from "../../actions/get-report-data";

interface IHSGComparisonChartProps {
  data: VCPerformanceDataPoint[];
}

function formatMonth(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(date);
  return months[d.getMonth()];
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function IHSGComparisonChart({ data }: IHSGComparisonChartProps) {
  // Filter data points that have IHSG values
  const dataWithIHSG = data.filter((d) => d.ihsgValue !== null && d.ihsgValue !== undefined);

  if (!dataWithIHSG || dataWithIHSG.length < 2) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.gold }]}>
            <Text style={[styles.sectionIconText, { color: colors.navy }]}>~</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Galfa vs IHSG Performance</Text>
            <Text style={styles.sectionSubtitle}>Performance comparison chart</Text>
          </View>
        </View>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>
            Insufficient IHSG data for comparison (need at least 2 months with IHSG values)
          </Text>
        </View>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = 500;
  const chartHeight = 160;
  const paddingLeft = 50;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 35;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Calculate percentage growth from first data point (base = 100)
  const baseAum = dataWithIHSG[0].aum;
  const baseIHSG = dataWithIHSG[0].ihsgValue!;

  const growthData = dataWithIHSG.map((point) => ({
    date: point.date,
    galfaGrowth: ((point.aum - baseAum) / baseAum) * 100,
    ihsgGrowth: ((point.ihsgValue! - baseIHSG) / baseIHSG) * 100,
  }));

  // Calculate min and max for Y axis
  const allGrowthValues = growthData.flatMap((d) => [d.galfaGrowth, d.ihsgGrowth]);
  const maxGrowth = Math.max(...allGrowthValues, 0);
  const minGrowth = Math.min(...allGrowthValues, 0);
  const growthRange = maxGrowth - minGrowth || 10;
  const growthPadding = growthRange * 0.15;
  const adjustedMin = minGrowth - growthPadding;
  const adjustedMax = maxGrowth + growthPadding;
  const adjustedRange = adjustedMax - adjustedMin;

  // Scale functions
  const scaleX = (index: number) => {
    return paddingLeft + (index / (growthData.length - 1)) * graphWidth;
  };

  const scaleY = (value: number) => {
    const normalized = (value - adjustedMin) / adjustedRange;
    return paddingTop + graphHeight - normalized * graphHeight;
  };

  // Calculate Y axis labels (5 labels)
  const yLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = adjustedMin + (adjustedRange * i) / 4;
    yLabels.push({
      value,
      y: scaleY(value),
      label: formatPercentage(value),
    });
  }

  // Generate line paths
  const galfaPath = growthData.map((point, i) => ({
    x: scaleX(i),
    y: scaleY(point.galfaGrowth),
  }));

  const ihsgPath = growthData.map((point, i) => ({
    x: scaleX(i),
    y: scaleY(point.ihsgGrowth),
  }));

  // Calculate final growth values
  const finalGalfaGrowth = growthData[growthData.length - 1].galfaGrowth;
  const finalIHSGGrowth = growthData[growthData.length - 1].ihsgGrowth;
  const outperformance = finalGalfaGrowth - finalIHSGGrowth;

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.gold }]}>
          <Text style={[styles.sectionIconText, { color: colors.navy }]}>~</Text>
        </View>
        <View>
          <Text style={styles.sectionTitle}>Galfa vs IHSG Performance</Text>
          <Text style={styles.sectionSubtitle}>
            Comparative growth over {growthData.length} month{growthData.length > 1 ? "s" : ""} (indexed to 0%)
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
                  stroke={label.value === 0 ? colors.border : colors.borderLight}
                  strokeWidth={label.value === 0 ? 1.5 : 1}
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

          {/* IHSG Line (dashed - gray) */}
          <G>
            {ihsgPath.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = ihsgPath[index - 1];
              return (
                <Line
                  key={`ihsg-line-${index}`}
                  x1={prevPoint.x}
                  y1={prevPoint.y}
                  x2={point.x}
                  y2={point.y}
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="4,3"
                />
              );
            })}
            {/* IHSG Data Points */}
            {ihsgPath.map((point, index) => (
              <Circle
                key={`ihsg-point-${index}`}
                cx={point.x}
                cy={point.y}
                r={3}
                fill="#9CA3AF"
              />
            ))}
          </G>

          {/* Galfa Line (solid - navy/gold) */}
          <G>
            {galfaPath.map((point, index) => {
              if (index === 0) return null;
              const prevPoint = galfaPath[index - 1];
              return (
                <Line
                  key={`galfa-line-${index}`}
                  x1={prevPoint.x}
                  y1={prevPoint.y}
                  x2={point.x}
                  y2={point.y}
                  stroke={colors.navy}
                  strokeWidth={2.5}
                />
              );
            })}
            {/* Galfa Data Points */}
            {galfaPath.map((point, index) => (
              <Circle
                key={`galfa-point-${index}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={colors.navy}
              />
            ))}
          </G>

          {/* X axis labels (months) */}
          <G>
            {growthData.map((point, index) => {
              // Show fewer labels if many data points
              const showEvery = growthData.length > 6 ? 2 : 1;
              if (index % showEvery !== 0 && index !== growthData.length - 1) return null;
              return (
                <Text
                  key={`x-label-${index}`}
                  x={scaleX(index)}
                  y={chartHeight - paddingBottom + 12}
                  style={{
                    fontSize: 7,
                    textAnchor: "middle",
                    fill: colors.textSecondary,
                  }}
                >
                  {formatMonth(point.date)}
                </Text>
              );
            })}
          </G>
        </Svg>

        {/* Legend and Summary Row */}
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
          {/* Legend */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 20,
                  height: 3,
                  backgroundColor: colors.navy,
                  marginRight: 6,
                  borderRadius: 1,
                }}
              />
              <Text style={{ fontSize: 8, color: colors.textSecondary }}>
                Galfa
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 20,
                  height: 0,
                  borderTopWidth: 2,
                  borderTopColor: "#9CA3AF",
                  borderStyle: "dashed",
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 8, color: colors.textSecondary }}>
                IHSG
              </Text>
            </View>
          </View>

          {/* Summary Stats */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>Galfa Growth</Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  color: finalGalfaGrowth >= 0 ? colors.success : colors.danger,
                }}
              >
                {formatPercentage(finalGalfaGrowth)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>IHSG Growth</Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  color: finalIHSGGrowth >= 0 ? colors.success : colors.danger,
                }}
              >
                {formatPercentage(finalIHSGGrowth)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>Outperformance</Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "bold",
                  color: outperformance >= 0 ? colors.success : colors.danger,
                }}
              >
                {formatPercentage(outperformance)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
