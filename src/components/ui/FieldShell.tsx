import React from "react";
import { TextStyle, View, ViewStyle, type StyleProp } from "react-native";

import { getFieldShadowStyle } from "../../styles/shadows";
import { components, radius } from "../../styles/tokens";
import type { ThemeColors } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeProvider";

type FieldShellProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
};

export function FieldShell({ children, style, muted = false }: FieldShellProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          borderWidth: 0,
          borderRadius: radius.md,
          padding: components.inputPadding,
          backgroundColor: muted ? colors.surfaceMuted : colors.surfaceRaised,
        },
        getFieldShadowStyle(colors),
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function getFieldInputStyle(colors: ThemeColors): TextStyle {
  return {
    borderWidth: 0,
    backgroundColor: "transparent",
    borderRadius: radius.md,
    color: colors.text,
    padding: 0,
  };
}
