import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { Text } from "./Themed";

type LoadingPlaceholderProps = {
  label?: string;
};

export function LoadingPlaceholder({ label = "Loading..." }: LoadingPlaceholderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <ActivityIndicator size="small" color={colors.primaryBg} />
      <Text style={{ color: colors.mutedText }}>{label}</Text>
    </View>
  );
}
