import React from "react";
import { View } from "react-native";

import { SavingsProgressCard } from "../../../../components/SavingsProgressCard";
import { Text } from "../../../../components/Themed";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { useTheme } from "../../../../theme/ThemeProvider";

import type { DashboardSavingsBreakdownItem } from "../types";

type DashboardSavingsBreakdownSectionProps = {
  savingsBreakdown: DashboardSavingsBreakdownItem[];
  focusKey: number;
};

export function DashboardSavingsBreakdownSection({
  savingsBreakdown,
  focusKey,
}: DashboardSavingsBreakdownSectionProps) {
  const { colors } = useTheme();

  return (
    <SectionCard style={{ padding: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Savings Breakdown</Text>

      {savingsBreakdown.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
            No accounts yet
          </Text>
          <Text style={{ color: colors.mutedText }}>
            Add a savings account to track your balance.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 10 }}>
          {savingsBreakdown.map((account) => (
            <SavingsProgressCard
              key={account.id}
              title={account.name}
              balance={account.balance}
              goalAmount={account.goalAmount}
              institution={account.institution}
              accountCategory={account.accountCategory}
              fillColor={colors.primaryBg}
              triggerKey={`${focusKey}:${account.id}`}
              dimmed={account.includeInTotals === 0}
            />
          ))}
        </View>
      )}
    </SectionCard>
  );
}
