import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "../Themed";
import { useTheme } from "../../theme/ThemeProvider";
import { ModalOverflowMenu, type OverflowMenuItem } from "./ModalOverflowMenu";

export type ModalHeaderBarProps = {
  title: string;
  subtitle?: string;
  titleAccessory?: React.ReactNode;
  rightContent?: React.ReactNode;
  actions?: OverflowMenuItem[];
  menuAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ModalHeaderBar({
  title,
  subtitle,
  titleAccessory,
  rightContent,
  actions = [],
  menuAccessibilityLabel,
  style,
}: ModalHeaderBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftColumn}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {titleAccessory ? <View style={styles.titleAccessory}>{titleAccessory}</View> : null}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={styles.rightCluster}>
        {rightContent}
        {actions.length ? (
          <ModalOverflowMenu actions={actions} accessibilityLabel={menuAccessibilityLabel} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  leftColumn: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    flexShrink: 1,
  },
  titleAccessory: {
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
  },
});
