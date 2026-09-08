import React from "react";
import { StyleProp, TextStyle, View, ViewStyle } from "react-native";

import { components } from "../../styles/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../Themed";

type ThemeBadgeTone = "settled" | "partial" | "unsettled" | "overdue" | "paid" | "unpaid";

type StatusBadgeProps = {
  label: string;
  tone?: ThemeBadgeTone | "muted";
  backgroundColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function StatusBadge({
  label,
  tone = "muted",
  backgroundColor,
  textColor,
  style,
  textStyle,
}: StatusBadgeProps) {
  const { colors } = useTheme();
  const themedColors =
    tone === "muted"
      ? { background: colors.surfaceMuted, text: colors.mutedText }
      : colors.badges[tone];

  return (
    <View
      style={[
        {
          borderRadius: components.statusBadgeRadius,
          paddingVertical: components.badgePaddingVertical,
          paddingHorizontal: components.badgePaddingHorizontal,
          backgroundColor: backgroundColor ?? themedColors.background,
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            fontWeight: "700",
            fontSize: components.badgeFontSize,
            color: textColor ?? themedColors.text,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
