import React from "react";
import { View } from "react-native";

import { ProgressBarRow } from "../../../../components/ui/ProgressBarRow";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { Text } from "../../../../components/Themed";
import { InlinePillAction } from "../../../../components/ui/InlinePillAction";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import { formatMonthLabel } from "../../../../utils/dates";
import type { DashboardCurrentMonthSpending } from "../types";

type DashboardCurrentSpendingCardProps = {
  spending: DashboardCurrentMonthSpending;
  focusKey: number;
  onPressOpenExpenses: () => void;
};

export function DashboardCurrentSpendingCard({
  spending,
  focusKey,
  onPressOpenExpenses,
}: DashboardCurrentSpendingCardProps) {
  const { colors } = useTheme();

  return (
    <SectionCard style={{ padding: 14, gap: 10 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
          Current Month Spending
        </Text>
        <Text style={{ color: colors.mutedText }}>{formatMonthLabel(spending.monthAnchor)}</Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.mutedText, fontSize: 12 }}>Spent</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
            {php.format(spending.spent ?? 0)}
          </Text>
        </View>
        <InlinePillAction
          compact
          label="Open Expenses"
          onPress={onPressOpenExpenses}
          accessibilityLabel="Open Expenses tab"
        />
      </View>

      <ProgressBarRow
        ratio={spending.progressRatio}
        fillColor={colors.primaryBg}
        triggerKey={focusKey}
      />
      <Text style={{ color: colors.mutedText, fontSize: 12 }}>{spending.subtitle}</Text>
    </SectionCard>
  );
}
