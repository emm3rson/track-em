import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { DonutChart, type DonutSegment } from "../../../../components/charts/DonutChart";
import { Text } from "../../../../components/Themed";
import { ModalOverflowMenu } from "../../../../components/ui/ModalOverflowMenu";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import type { DashboardTotals } from "../types";

type DashboardTotalsCardProps = {
  totals: DashboardTotals;
  focusKey: number;
};

export function DashboardTotalsCard({ totals, focusKey }: DashboardTotalsCardProps) {
  const { colors } = useTheme();
  const [showReceivables, setShowReceivables] = useState(true);

  const allSegments = useMemo<DonutSegment[]>(
    () => [
      {
        key: "wallets",
        label: "Wallets",
        value: totals.wallets ?? 0,
        color: colors.badges.partial.text,
      },
      {
        key: "savings",
        label: "Savings",
        value: totals.savings ?? 0,
        color: colors.success,
      },
      {
        key: "receivables",
        label: "Receivables",
        value: totals.peopleOwe ?? 0,
        color: colors.badges.unsettled.text,
      },
    ],
    [
      colors.badges.partial.text,
      colors.badges.unsettled.text,
      colors.success,
      totals.peopleOwe,
      totals.savings,
      totals.wallets,
    ]
  );

  const segments = showReceivables
    ? allSegments
    : allSegments.filter((s) => s.key !== "receivables");

  const displayedTotal = showReceivables
    ? (totals.totalFunds ?? 0)
    : (totals.wallets ?? 0) + (totals.savings ?? 0);

  const itemBasis = `${(100 / segments.length).toFixed(3)}%` as `${number}%`;

  const menuActions = [
    {
      key: "toggle-receivables",
      label: showReceivables ? "Hide Receivables" : "Show Receivables",
      icon: showReceivables ? (
        <EyeOff size={16} color={colors.mutedText} />
      ) : (
        <Eye size={16} color={colors.mutedText} />
      ),
      onPress: () => setShowReceivables((v) => !v),
    },
  ];

  return (
    <SectionCard style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Totals</Text>
        <ModalOverflowMenu actions={menuActions} />
      </View>

      <View style={{ alignItems: "center", gap: 14, marginTop: 8 }}>
        <DonutChart
          segments={segments}
          centerValueText={php.format(displayedTotal)}
          centerSubtitle="Total Funds"
          trackColor={colors.chartTrack}
          subtitleColor={colors.mutedText}
          entranceTriggerKey={focusKey}
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12, width: "100%" }}>
          {segments.map((segment) => (
            <View
              key={segment.key}
              style={{
                flexGrow: 1,
                flexBasis: itemBasis,
                maxWidth: itemBasis,
                minWidth: 90,
                gap: 4,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: segment.color }}
                numberOfLines={1}
              >
                {segment.label}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  textAlign: "center",
                  color: colors.text,
                }}
                numberOfLines={1}
              >
                {php.format(segment.value ?? 0)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SectionCard>
  );
}
