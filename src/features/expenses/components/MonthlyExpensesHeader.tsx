import React from "react";
import { View } from "react-native";

import { Text } from "../../../components/Themed";
import { PrimaryButton } from "../../../components/ui/PrimaryButton";
import { useTheme } from "../../../theme/ThemeProvider";

type MonthlyExpensesHeaderProps = {
  onAddExpense: () => void;
};

export function MonthlyExpensesHeader({ onAddExpense }: MonthlyExpensesHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>
          Monthly Expenses
        </Text>
        <Text style={{ color: colors.mutedText }}>Track monthly spending by category.</Text>
      </View>
      <PrimaryButton accessibilityLabel="Add expense" onPress={onAddExpense}>
        + Expense
      </PrimaryButton>
    </View>
  );
}
