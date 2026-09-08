import React from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { X } from "lucide-react-native";

import { useTheme } from "../../theme/ThemeProvider";

type CloseIconButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

export function CloseIconButton({
  onPress,
  accessibilityLabel = "Close",
  disabled = false,
  style,
  iconSize = 17,
}: CloseIconButtonProps) {
  const { colors, scheme } = useTheme();
  const baseOpacity = scheme === "light" ? 0.82 : 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.button, style]}
    >
      <X size={iconSize} color={colors.text} style={{ opacity: disabled ? 0.5 : baseOpacity }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
