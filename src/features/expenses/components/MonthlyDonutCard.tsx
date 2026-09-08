import React from "react";
import { Pressable, View } from "react-native";

import { DonutChart, type DonutSegment } from "../../../components/charts/DonutChart";
import { Card, Text } from "../../../components/Themed";
import { useTheme } from "../../../theme/ThemeProvider";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

type MonthlyDonutCardProps = {
  monthLabel: string;
  segments: DonutSegment[];
  centerValueText: string;
  centerSubtitle: string;
  focusKey: number;
  selectionShade?:
    | {
        segmentKey: string;
        triggerKey: string;
        durationMs?: number;
      }
    | undefined;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const MONTHLY_DONUT_SIZE = 176;
const MONTHLY_DONUT_STROKE = 28;

export function MonthlyDonutCard({
  monthLabel,
  segments,
  centerValueText,
  centerSubtitle,
  focusKey,
  selectionShade,
  onPrevMonth,
  onNextMonth,
}: MonthlyDonutCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={{ padding: 12, gap: 8 }}>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{monthLabel}</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <DonutChart
          segments={segments}
          centerValueText={centerValueText}
          centerSubtitle={centerSubtitle}
          trackColor={colors.chartTrack}
          subtitleColor={colors.mutedText}
          size={MONTHLY_DONUT_SIZE}
          strokeWidth={MONTHLY_DONUT_STROKE}
          entranceTriggerKey={focusKey}
          selectionShade={selectionShade}
        />
      </View>
      <Pressable
        onPress={onPrevMonth}
        accessibilityLabel="Previous month"
        style={({ pressed }) => ({
          position: "absolute",
          left: 4,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          borderRadius: 999,
          paddingHorizontal: 12,
          zIndex: 1,
          opacity: pressed ? 0.3 : 1,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        })}
      >
        <ChevronLeft size={24} color={colors.iconMuted} style={{ opacity: 0.82 }} />
      </Pressable>
      <Pressable
        onPress={onNextMonth}
        accessibilityLabel="Next month"
        style={({ pressed }) => ({
          position: "absolute",
          right: 4,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          borderRadius: 999,
          paddingHorizontal: 12,
          zIndex: 1,
          opacity: pressed ? 0.3 : 1,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        })}
      >
        <ChevronRight size={24} color={colors.iconMuted} style={{ opacity: 0.82 }} />
      </Pressable>
    </Card>
  );
}
