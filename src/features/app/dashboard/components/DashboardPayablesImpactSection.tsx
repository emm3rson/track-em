import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { InnerCard } from "../../../../components/ui/InnerCard";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { Text } from "../../../../components/Themed";
import { spacing } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import type { DashboardPayablesImpact } from "../types";

const BAR_ANIMATION_DURATION_MS = 600;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type DashboardPayablesImpactSectionProps = {
  payablesImpact: DashboardPayablesImpact;
  totalFunds: number;
  focusKey: number;
};

export function DashboardPayablesImpactSection({
  payablesImpact,
  totalFunds,
  focusKey,
}: DashboardPayablesImpactSectionProps) {
  const { colors } = useTheme();

  return (
    <SectionCard style={{ padding: 14, gap: 8 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Payables Impact</Text>
        <Text style={{ color: colors.mutedText }}>Outstanding vs net funds</Text>
      </View>

      <PayablesImpactWindowRow
        label="This Month"
        credits={payablesImpact.currentMonth.credits}
        net={payablesImpact.currentMonth.net}
        totalFunds={totalFunds}
        focusKey={focusKey}
      />
      <PayablesImpactWindowRow
        label="3-Month Outlook"
        credits={payablesImpact.threeMonthOutlook.credits}
        net={payablesImpact.threeMonthOutlook.net}
        totalFunds={totalFunds}
        focusKey={focusKey}
      />
      <PayablesImpactWindowRow
        label="All-time"
        credits={payablesImpact.allTime.credits}
        net={payablesImpact.allTime.net}
        totalFunds={totalFunds}
        focusKey={focusKey}
      />
    </SectionCard>
  );
}

type PayablesImpactWindowRowProps = {
  label: string;
  credits: number;
  net: number;
  totalFunds: number;
  focusKey: number;
};

function PayablesImpactWindowRow({
  label,
  credits,
  net,
  totalFunds,
  focusKey,
}: PayablesImpactWindowRowProps) {
  const { colors } = useTheme();
  const safeTotal = Math.max(0, totalFunds ?? 0);
  const safePayables = Math.max(0, credits ?? 0);
  const safeNet = net ?? safeTotal - safePayables;
  const payablesRatio = safeTotal > 0 ? clamp01(safePayables / safeTotal) : 0;
  const netRatio =
    safeTotal > 0 ? Math.max(0, Math.min(safeNet / safeTotal, 1 - payablesRatio)) : 0;
  const filledRatio = Math.min(1, payablesRatio + netRatio);

  const filledProgress = useSharedValue(0);
  const payablesProgress = useSharedValue(0);

  useEffect(() => {
    filledProgress.value = 0;
    payablesProgress.value = 0;
    filledProgress.value = withTiming(filledRatio, { duration: BAR_ANIMATION_DURATION_MS });
    payablesProgress.value = withTiming(payablesRatio, { duration: BAR_ANIMATION_DURATION_MS });
  }, [filledProgress, filledRatio, payablesProgress, payablesRatio, focusKey]);

  const filledBarStyle = useAnimatedStyle(() => ({
    width: `${(filledProgress.value * 100).toFixed(4)}%` as `${number}%`,
  }));

  const payablesBarStyle = useAnimatedStyle(() => ({
    width: `${(payablesProgress.value * 100).toFixed(4)}%` as `${number}%`,
  }));

  return (
    <InnerCard style={{ padding: 12, gap: 8 }}>
      <Text style={{ fontWeight: "700", color: colors.text }}>{label}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.mutedText }}>Payables</Text>
          <Text style={{ fontWeight: "700", color: colors.text }}>{php.format(credits ?? 0)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={{ fontSize: 12, color: colors.mutedText }}>Net</Text>
          <Text style={{ fontWeight: "700", color: colors.text }}>{php.format(net ?? 0)}</Text>
        </View>
      </View>

      <View
        style={{
          height: spacing.xs,
          borderRadius: 999,
          backgroundColor: colors.chartTrack,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            {
              height: "100%",
              backgroundColor: colors.primaryBg,
            },
            filledBarStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: colors.danger,
            },
            payablesBarStyle,
          ]}
        />
      </View>
    </InnerCard>
  );
}
