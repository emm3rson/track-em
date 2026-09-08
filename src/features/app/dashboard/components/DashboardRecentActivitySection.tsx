import React from "react";
import { Pressable, View } from "react-native";

import { InnerCard } from "../../../../components/ui/InnerCard";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { Text } from "../../../../components/Themed";
import { EmptyState } from "../../../../components/EmptyState";
import { TransactionHistoryIconButton } from "../../../../components/ui/TransactionHistoryIconButton";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import type { DashboardRecentActivityItem } from "../types";

type DashboardRecentActivitySectionProps = {
  activity: DashboardRecentActivityItem[];
  onPressOpenHistory: () => void;
  onPressActivityItem: (item: DashboardRecentActivityItem) => void;
};

export function DashboardRecentActivitySection({
  activity,
  onPressOpenHistory,
  onPressActivityItem,
}: DashboardRecentActivitySectionProps) {
  const { colors } = useTheme();

  return (
    <SectionCard style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
            Recent Activity
          </Text>
          <Text style={{ color: colors.mutedText }}>Latest account activity across your funds</Text>
        </View>
        <TransactionHistoryIconButton onPress={onPressOpenHistory} />
      </View>

      {activity.length === 0 ? (
        <EmptyState
          embedded
          title="No recent activity."
          description="Your latest entries will appear here."
        />
      ) : (
        <View style={{ gap: 8 }}>
          {activity.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${item.title}`}
              onPress={() => onPressActivityItem(item)}
            >
              <InnerCard style={{ padding: 10, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <Text
                    style={{ fontWeight: "700", color: colors.text, flex: 1 }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: item.amount < 0 ? colors.danger : colors.success,
                    }}
                  >
                    {php.format(item.amount ?? 0)}
                  </Text>
                </View>
                <Text style={{ color: colors.mutedText }} numberOfLines={1} ellipsizeMode="tail">
                  {item.subtitle}
                </Text>
              </InnerCard>
            </Pressable>
          ))}
        </View>
      )}
    </SectionCard>
  );
}
