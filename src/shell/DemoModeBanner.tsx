import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme/ThemeProvider";

type DemoModeBannerProps = {
  visible?: boolean;
};

export function DemoModeBanner({ visible = false }: DemoModeBannerProps) {
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryBg,
          paddingTop: insets.top + 6,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.primaryText, fontFamily }]}>
        Demo Mode Active
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    boxShadow: `0px 2px 4px rgba(0, 0, 0, 0.05)`,
  },
  label: {
    fontWeight: "700",
    fontSize: 13,
  },
});
