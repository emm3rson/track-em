import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

import { Text } from "../../../../components/Themed";
import { spacing } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { formatMonthLabel } from "../../../../utils/dates";
import type { DashboardPayablesImpactTrendPoint } from "../types";

const CHART_HEIGHT = 180;
const PLOT_PADDING = { top: 16, right: 8, bottom: 16, left: 8 } as const;
const REVEAL_DURATION_MS = 700;

type ChartPoint = {
  x: number;
  y: number;
  value: number;
};

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  negative: boolean;
};

type PayablesImpactLineChartProps = {
  points: DashboardPayablesImpactTrendPoint[];
  focusKey: number;
};

function monthTickLabel(monthIsoAnchor: string) {
  const date = new Date(monthIsoAnchor);
  return date.toLocaleString("en-PH", { month: "short", year: "2-digit" });
}

function splitSegmentAtZero(from: ChartPoint, to: ChartPoint, zeroY: number): Segment[] {
  const fromNeg = from.value < 0;
  const toNeg = to.value < 0;
  if (fromNeg === toNeg || from.value === to.value) {
    return [
      {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        negative: (from.value + to.value) / 2 < 0,
      },
    ];
  }

  const t = (0 - from.value) / (to.value - from.value);
  const crossX = from.x + (to.x - from.x) * t;

  return [
    {
      x1: from.x,
      y1: from.y,
      x2: crossX,
      y2: zeroY,
      negative: from.value < 0,
    },
    {
      x1: crossX,
      y1: zeroY,
      x2: to.x,
      y2: to.y,
      negative: to.value < 0,
    },
  ];
}

export function PayablesImpactLineChart({ points, focusKey }: PayablesImpactLineChartProps) {
  const { colors } = useTheme();
  const [chartWidth, setChartWidth] = useState(0);

  const revealProgress = useSharedValue(0);
  useEffect(() => {
    revealProgress.value = 0;
    revealProgress.value = withTiming(1, { duration: REVEAL_DURATION_MS });
  }, [focusKey, revealProgress]);

  const revealStyle = useAnimatedStyle(() => ({
    width: `${(revealProgress.value * 100).toFixed(4)}%` as `${number}%`,
  }));

  const chartData = useMemo(() => {
    if (chartWidth <= 0 || points.length === 0) return null;

    const plotWidth = Math.max(1, chartWidth - PLOT_PADDING.left - PLOT_PADDING.right);
    const plotHeight = Math.max(1, CHART_HEIGHT - PLOT_PADDING.top - PLOT_PADDING.bottom);

    const values = points.map((point) => point.net);
    const rawMin = Math.min(...values, 0);
    const rawMax = Math.max(...values, 0);
    const hasRange = Math.abs(rawMax - rawMin) > Number.EPSILON;
    const minValue = hasRange ? rawMin : rawMin - 1;
    const maxValue = hasRange ? rawMax : rawMax + 1;
    const valueRange = Math.max(maxValue - minValue, Number.EPSILON);

    const yFor = (value: number) =>
      PLOT_PADDING.top + ((maxValue - value) / valueRange) * plotHeight;
    const xFor = (index: number) =>
      PLOT_PADDING.left +
      (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);

    const chartPoints: ChartPoint[] = points.map((point, index) => ({
      x: xFor(index),
      y: yFor(point.net),
      value: point.net,
    }));

    const zeroY = yFor(0);
    const segments: Segment[] = [];
    for (let index = 0; index < chartPoints.length - 1; index += 1) {
      const from = chartPoints[index];
      const to = chartPoints[index + 1];
      segments.push(...splitSegmentAtZero(from, to, zeroY));
    }

    const midIndex = Math.floor((points.length - 1) / 2);
    const labels = {
      start: monthTickLabel(points[0].month),
      mid: monthTickLabel(points[midIndex].month),
      end: monthTickLabel(points[points.length - 1].month),
    };

    return {
      zeroY,
      segments,
      labels,
      hasNegative: points.some((point) => point.net < 0),
    };
  }, [chartWidth, points]);

  if (points.length === 0) {
    return (
      <View>
        <Text variant="muted">No payable trend yet</Text>
      </View>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View style={{ gap: spacing.xs }} testID="payables-impact-line-chart">
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
        <View>
          <Text style={{ fontSize: 12, color: colors.mutedText }}>Start Net</Text>
          <Text style={{ fontWeight: "700", color: colors.text }}>
            {formatMonthLabel(first.month)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 12, color: colors.mutedText }}>Latest Net</Text>
          <Text style={{ fontWeight: "700", color: colors.text }}>
            {formatMonthLabel(last.month)}
          </Text>
        </View>
      </View>

      <View
        testID="payables-impact-line-chart-viewport"
        style={{ height: CHART_HEIGHT }}
        onLayout={(event) => setChartWidth(Math.floor(event.nativeEvent.layout.width))}
      >
        {chartData ? (
          <Animated.View style={[{ height: "100%", overflow: "hidden" }, revealStyle]}>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Line
                x1={PLOT_PADDING.left}
                y1={chartData.zeroY}
                x2={chartWidth - PLOT_PADDING.right}
                y2={chartData.zeroY}
                stroke={colors.chartTrack}
                strokeWidth={1}
                strokeDasharray={[5, 4]}
              />
              {chartData.segments.map((segment, index) => (
                <Line
                  key={`${segment.x1}-${segment.y1}-${segment.x2}-${segment.y2}-${index}`}
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  stroke={segment.negative ? colors.danger : colors.primaryBg}
                  strokeWidth={3}
                  strokeLinecap="round"
                  testID={segment.negative ? "payables-impact-negative-segment" : undefined}
                />
              ))}
            </Svg>
          </Animated.View>
        ) : null}
      </View>

      {chartData?.hasNegative ? <View testID="payables-impact-negative-zone" /> : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 11, color: colors.mutedText }}>{chartData?.labels.start}</Text>
        <Text style={{ fontSize: 11, color: colors.mutedText }}>{chartData?.labels.mid}</Text>
        <Text style={{ fontSize: 11, color: colors.mutedText }}>{chartData?.labels.end}</Text>
      </View>
    </View>
  );
}
