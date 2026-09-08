import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";

import { typography } from "../../styles/tokens";
import { Text } from "../Themed";

const DEFAULT_DONUT_SIZE = 196;
const DEFAULT_DONUT_STROKE = 32;
const DEFAULT_SUBTITLE_FONT_SIZE = 11;
const DEFAULT_SELECTION_SHADE_DURATION_MS = 300;
const ENTRANCE_ANIMATION_DURATION_MS = 800;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  centerValueText: string;
  centerSubtitle: string;
  trackColor: string;
  subtitleColor: string;
  size?: number;
  strokeWidth?: number;
  entranceTriggerKey?: string | number;
  selectionShade?: {
    segmentKey: string;
    triggerKey: string;
    durationMs?: number;
  };
};

type ArcData = {
  key: string;
  color: string;
  length: number;
  startOffset: number;
  endOffset: number;
};

// Separate component so each arc can call useAnimatedProps independently
function AnimatedArc({
  arc,
  entranceProgress,
  circumference,
  strokeWidth,
  center,
  r,
}: {
  arc: ArcData;
  entranceProgress: SharedValue<number>;
  circumference: number;
  strokeWidth: number;
  center: number;
  r: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const visibleLength = arc.length * entranceProgress.value;
    return {
      strokeDasharray: [visibleLength, Math.max(circumference - visibleLength, 0)],
    };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={r}
      stroke={arc.color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
      strokeDashoffset={-arc.startOffset}
      animatedProps={animatedProps}
    />
  );
}

function AnimatedTrackRing({
  entranceProgress,
  circumference,
  strokeWidth,
  trackColor,
  center,
  r,
}: {
  entranceProgress: SharedValue<number>;
  circumference: number;
  strokeWidth: number;
  trackColor: string;
  center: number;
  r: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const visibleLength = circumference * entranceProgress.value;
    return {
      strokeDasharray: [visibleLength, Math.max(circumference - visibleLength, 0)],
    };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={r}
      stroke={trackColor}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
      animatedProps={animatedProps}
    />
  );
}

export function DonutChart({
  segments,
  centerValueText,
  centerSubtitle,
  trackColor,
  subtitleColor,
  size = DEFAULT_DONUT_SIZE,
  strokeWidth = DEFAULT_DONUT_STROKE,
  entranceTriggerKey,
  selectionShade,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const nonZeroSegments = segments.filter((segment) => segment.value > 0);
  const totalValue = nonZeroSegments.reduce((sum, segment) => sum + segment.value, 0);

  const entranceProgress = useSharedValue(0);
  const remainingShadeLength = useSharedValue(0);

  // Draw-in entrance animation on mount and on trigger key changes
  useEffect(() => {
    entranceProgress.value = 0;
    entranceProgress.value = withTiming(1, { duration: ENTRANCE_ANIMATION_DURATION_MS });
  }, [entranceProgress, entranceTriggerKey]);

  const arcs = nonZeroSegments.map((segment) => {
    const length = totalValue > 0 ? (segment.value / totalValue) * circumference : 0;
    return { ...segment, length };
  });

  let cumulative = 0;
  const arcsWithOffsets: ArcData[] = arcs.map((arc) => {
    const startOffset = cumulative;
    const endOffset = startOffset + arc.length;
    cumulative += arc.length;
    return { ...arc, startOffset, endOffset };
  });

  // Selection shade overlay animation
  const selectedArc = selectionShade
    ? (arcsWithOffsets.find((arc) => arc.key === selectionShade.segmentKey) ?? null)
    : null;
  const selectedArcColor = selectedArc?.color ?? null;
  const selectedArcEndOffset = selectedArc?.endOffset ?? 0;
  const remainingArcLength = selectedArc ? Math.max(circumference - selectedArc.length, 0) : 0;
  const shouldAnimateRemainingShade = !!selectionShade && !!selectedArc && remainingArcLength > 0;
  const [overlayShadeArc, setOverlayShadeArc] = useState<{
    color: string;
    startOffset: number;
  } | null>(null);

  useEffect(() => {
    if (shouldAnimateRemainingShade && selectedArcColor) {
      setOverlayShadeArc((prev) => {
        if (
          prev &&
          prev.color === selectedArcColor &&
          Math.abs(prev.startOffset - selectedArcEndOffset) < Number.EPSILON
        ) {
          return prev;
        }
        return {
          color: selectedArcColor,
          startOffset: selectedArcEndOffset,
        };
      });
      remainingShadeLength.value = 0;
      remainingShadeLength.value = withTiming(remainingArcLength, {
        duration: selectionShade?.durationMs ?? DEFAULT_SELECTION_SHADE_DURATION_MS,
      });
      return;
    }
    if (!overlayShadeArc) {
      remainingShadeLength.value = 0;
      return;
    }
    remainingShadeLength.value = withTiming(0, {
      duration: selectionShade?.durationMs ?? DEFAULT_SELECTION_SHADE_DURATION_MS,
    });
  }, [
    overlayShadeArc,
    remainingArcLength,
    remainingShadeLength,
    selectedArcColor,
    selectedArcEndOffset,
    selectionShade?.durationMs,
    selectionShade?.triggerKey,
    shouldAnimateRemainingShade,
  ]);

  const remainingShadeAnimatedProps = useAnimatedProps(() => {
    const length = Math.max(0, Math.min(remainingShadeLength.value, circumference));
    return {
      strokeDasharray: [length, Math.max(circumference - length, 0)],
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation="180" origin={`${center}, ${center}`}>
          <AnimatedTrackRing
            entranceProgress={entranceProgress}
            circumference={circumference}
            strokeWidth={strokeWidth}
            trackColor={trackColor}
            center={center}
            r={radius}
          />
          {arcsWithOffsets.map((arc) => (
            <AnimatedArc
              key={arc.key}
              arc={arc}
              entranceProgress={entranceProgress}
              circumference={circumference}
              strokeWidth={strokeWidth}
              center={center}
              r={radius}
            />
          ))}
          {overlayShadeArc ? (
            <AnimatedCircle
              key={selectionShade?.triggerKey ?? "selection-shade-overlay"}
              cx={center}
              cy={center}
              r={radius}
              stroke={overlayShadeArc.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              strokeDashoffset={-overlayShadeArc.startOffset}
              animatedProps={remainingShadeAnimatedProps}
            />
          ) : null}
        </G>
      </Svg>
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          gap: 1,
          width: size - 2 * strokeWidth - 16,
        }}
      >
        <Text style={{ fontSize: typography.body, fontWeight: "700", textAlign: "center" }}>
          {centerValueText}
        </Text>
        <Text
          style={{
            fontSize: DEFAULT_SUBTITLE_FONT_SIZE,
            color: subtitleColor,
            textAlign: "center",
          }}
        >
          {centerSubtitle}
        </Text>
      </View>
    </View>
  );
}
