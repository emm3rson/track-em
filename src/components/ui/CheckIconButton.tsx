import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Check } from "lucide-react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AnimatedPressable } from "./AnimatedPressable";

type CheckIconButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

export function CheckIconButton({
  onPress,
  accessibilityLabel = "Done",
  disabled = false,
  style,
  iconSize = 19,
}: CheckIconButtonProps) {
  const { colors, scheme } = useTheme();
  const baseOpacity = scheme === "light" ? 0.82 : 1;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.button, style]}
    >
      <Check
        size={iconSize}
        color={colors.text}
        style={{ opacity: disabled ? 0.5 : baseOpacity }}
      />
    </AnimatedPressable>
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
