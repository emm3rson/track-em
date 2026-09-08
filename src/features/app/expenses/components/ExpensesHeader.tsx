import React from "react";
import { View } from "react-native";

import { Text } from "../../../../components/Themed";
import { useTheme } from "../../../../theme/ThemeProvider";

export function ExpensesHeader() {
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
    </View>
  );
}
