import React from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "./Themed";
import { useTheme } from "../theme/ThemeProvider";
import { typography } from "../styles/tokens";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  rowGap?: number;
};

export function ScreenHeader({ title, subtitle, rightContent, rowGap = 12 }: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { gap: rowGap }]}>
      <View style={styles.textBlock}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text>
        ) : null}
      </View>
      {rightContent ? <View style={styles.right}>{rightContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textBlock: {
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: typography.body,
  },
});
