import React from "react";
import { Pressable, View } from "react-native";

import { SavingsProgressCard } from "../../../components/SavingsProgressCard";
import { Card, Text } from "../../../components/Themed";
import { InnerCard } from "../../../components/ui/InnerCard";
import { InstitutionLogo } from "../../../components/ui/InstitutionLogo";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import type { AccountRow } from "../types";

export type AccountSectionProps = {
  title: string;
  rows: AccountRow[];
  onPressRow: (row: AccountRow) => void;
  onLongPressRow?: (row: AccountRow) => void;
  variant?: "default" | "savings";
  progressTriggerKey?: string | number;
  actionLabel?: string;
  onActionPress?: () => void;
  onAddPress: () => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
};

export function AccountSection({
  title,
  rows,
  onPressRow,
  onLongPressRow,
  variant = "default",
  progressTriggerKey,
  actionLabel,
  onActionPress,
  onAddPress,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
}: AccountSectionProps) {
  const { colors } = useTheme();
  const isSavings = variant === "savings";

  return (
    <Card variant="section" style={{ padding: 14, gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800" }}>{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onActionPress}
            style={{ paddingVertical: 4, paddingHorizontal: 0 }}
          >
            <Text style={{ color: colors.primaryBg, fontWeight: "600", fontSize: 14 }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {rows.length === 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>{emptyTitle}</Text>
          <Text style={{ color: colors.mutedText }}>{emptyDescription}</Text>
        </View>
      ) : (
        rows.map((acc) => {
          const isExcluded = acc.includeInTotals === 0;
          if (isSavings) {
            const balance = acc.balance ?? 0;
            return (
              <SavingsProgressCard
                key={acc.id}
                title={acc.name}
                balance={balance}
                goalAmount={acc.goalAmount}
                onPress={() => onPressRow(acc)}
                onLongPress={onLongPressRow ? () => onLongPressRow(acc) : undefined}
                dimmed={isExcluded}
                institution={acc.institution}
                accountCategory={acc.accountCategory}
                triggerKey={
                  progressTriggerKey == null ? undefined : `${String(progressTriggerKey)}:${acc.id}`
                }
              />
            );
          }

          return (
            <Pressable
              key={acc.id}
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${acc.name}`}
              onPress={() => onPressRow(acc)}
              onLongPress={onLongPressRow ? () => onLongPressRow(acc) : undefined}
            >
              <InnerCard
                muted={isExcluded}
                style={{
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <InstitutionLogo institution={acc.institution} accountName={acc.name} size={32} />
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      alignItems: "center",
                      columnGap: 8,
                      rowGap: 4,
                      flexShrink: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        flexShrink: 1,
                        color: isExcluded ? colors.mutedText : colors.text,
                      }}
                    >
                      {acc.name}
                    </Text>
                    {isExcluded ? (
                      <Text style={{ fontWeight: "700", color: colors.mutedText, fontSize: 12 }}>
                        Excluded
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontWeight: "800",
                      color: isExcluded ? colors.mutedText : colors.text,
                    }}
                  >
                    {php.format(acc.balance ?? 0)}
                  </Text>
                </View>
              </InnerCard>
            </Pressable>
          );
        })
      )}
    </Card>
  );
}
