import React, { useMemo } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

import { php } from "../utils/currency";
import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Themed";
import { InnerCard } from "./ui/InnerCard";
import { InstitutionLogo } from "./ui/InstitutionLogo";
import { ProgressBarRow } from "./ui/ProgressBarRow";
import { hexToRgb } from "../utils/colorMath";

type SavingsProgressCardProps = {
  title: string;
  balance: number;
  goalAmount?: number | null;
  onPress?: () => void;
  onLongPress?: () => void;
  fillColor?: string;
  dimmed?: boolean;
  institution?: string | null;
  accountCategory?: string | null;
  triggerKey?: string | number;
  cardStyle?: StyleProp<ViewStyle>;
};

function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith("#")) return color;
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SavingsProgressCard({
  title,
  balance,
  goalAmount,
  onPress,
  onLongPress,
  fillColor,
  dimmed = false,
  institution,
  accountCategory,
  triggerKey,
  cardStyle,
}: SavingsProgressCardProps) {
  const { colors, scheme } = useTheme();
  const primaryTextColor = dimmed ? colors.mutedText : colors.text;

  const { ratio, goalLabel, subtitle } = useMemo(() => {
    const hasGoalValue = goalAmount != null && goalAmount > 0;
    const clampedRatio = hasGoalValue ? Math.max(0, Math.min(1, balance / (goalAmount ?? 1))) : 0;
    const secondaryText =
      accountCategory === "INVESTMENT"
        ? institution
          ? `Investment - ${institution}`
          : "Investment"
        : (institution ?? "Bank institution");

    return {
      ratio: clampedRatio,
      goalLabel: hasGoalValue ? `Goal: ${php.format(goalAmount ?? 0)}` : "Goal: Not set",
      subtitle: secondaryText,
    };
  }, [accountCategory, balance, goalAmount, institution]);

  const resolvedFillColor = useMemo(() => {
    if (fillColor) return fillColor;
    return scheme === "dark" ? withAlpha(colors.primaryBg, 0.75) : colors.primaryBg;
  }, [colors.primaryBg, fillColor, scheme]);

  const content = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <InstitutionLogo institution={institution} accountName={title} size={32} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ fontWeight: "700", flex: 1, color: primaryTextColor }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ fontWeight: "800", color: primaryTextColor }} numberOfLines={1}>
              {php.format(balance)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.mutedText, fontSize: 12, flex: 1 }} numberOfLines={1}>
              {subtitle}
            </Text>
            <Text style={{ color: colors.mutedText, fontSize: 12 }} numberOfLines={1}>
              {goalLabel}
            </Text>
          </View>
        </View>
      </View>
      <ProgressBarRow ratio={ratio} fillColor={resolvedFillColor} triggerKey={triggerKey} />
    </>
  );

  const innerCardStyle: StyleProp<ViewStyle> = [
    {
      padding: 12,
      gap: 8,
    },
    cardStyle,
  ];

  if (onPress || onLongPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open actions for ${title}`}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <InnerCard muted={dimmed} style={innerCardStyle}>
          {content}
        </InnerCard>
      </Pressable>
    );
  }

  return (
    <InnerCard muted={dimmed} style={innerCardStyle}>
      {content}
    </InnerCard>
  );
}
