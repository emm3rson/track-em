import React from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function ScreenGradient() {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
    />
  );
}
