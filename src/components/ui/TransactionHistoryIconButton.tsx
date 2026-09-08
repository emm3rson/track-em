import React from "react";
import { FileClock } from "lucide-react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { AnimatedPressable } from "./AnimatedPressable";

type TransactionHistoryIconButtonProps = {
  onPress: () => void;
};

export function TransactionHistoryIconButton({ onPress }: TransactionHistoryIconButtonProps) {
  const { colors } = useTheme();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Open transaction history"
      onPress={onPress}
      hitSlop={10}
      style={{ width: 36, height: 36, justifyContent: "center", alignItems: "center" }}
    >
      <FileClock size={24} color={colors.icon} />
    </AnimatedPressable>
  );
}
