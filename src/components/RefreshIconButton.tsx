import React from "react";
import { StyleProp, ViewStyle } from "react-native";

import { RefreshCw } from "lucide-react-native";

import { useTheme } from "../theme/ThemeProvider";
import { getSecondaryIconButtonStyle } from "../styles/buttons";
import { AnimatedPressable } from "./ui/AnimatedPressable";

type RefreshIconButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RefreshIconButton({ onPress, disabled, style }: RefreshIconButtonProps) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={[
        getSecondaryIconButtonStyle(colors),
        {
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <RefreshCw size={20} color={colors.icon} />
    </AnimatedPressable>
  );
}
