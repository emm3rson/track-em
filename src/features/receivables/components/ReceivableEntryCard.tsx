import React, { useMemo } from "react";
import { Pressable, View } from "react-native";

import { Card, Text } from "../../../components/Themed";
import { getPillOutlineStyle, getPillOutlineTextStyle } from "../../../styles/buttons";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import type { ReceivableRow } from "../types";
import { ReceivableBadgeGroup, type ReceivableBadgeItem } from "./ReceivableBadgeGroup";

type ReceivableEntryCardProps = {
  entry: ReceivableRow;
  todayStart: Date;
  onOpenActions: (entry: ReceivableRow) => void;
  onOpenPaymentHistory: (entry: ReceivableRow) => void;
};

export function ReceivableEntryCard({
  entry,
  todayStart,
  onOpenActions,
  onOpenPaymentHistory,
}: ReceivableEntryCardProps) {
  const { colors } = useTheme();

  const remaining = Math.max(0, entry.amount - (entry.paidAmount ?? 0));
  const isSettled = remaining <= 0;
  const isPartial = !isSettled && (entry.paidAmount ?? 0) > 0;
  const isExcluded = entry.includeInTotal === 0;
  const hasPayments = (entry.paidAmount ?? 0) > 0;
  const targetDate = entry.targetPaymentDate ? new Date(entry.targetPaymentDate) : null;
  const isOverdue = !isSettled && targetDate !== null && targetDate < todayStart;
  const targetDateLabel = targetDate ? targetDate.toLocaleDateString("en-PH") : null;
  const entryBackground = isExcluded || isSettled ? colors.surfaceMuted : colors.surfaceSection;

  const statusBadge = useMemo<ReceivableBadgeItem>(
    () => ({
      key: "status",
      label: isSettled ? "Settled" : isPartial ? "Partially settled" : "Unsettled",
      backgroundColor: isSettled
        ? colors.badges.settled.background
        : isPartial
          ? colors.badges.partial.background
          : colors.badges.unsettled.background,
      textColor: isSettled
        ? colors.badges.settled.text
        : isPartial
          ? colors.badges.partial.text
          : colors.badges.unsettled.text,
    }),
    [colors.badges, isPartial, isSettled]
  );

  const nonStatusBadges = [
    ...(isExcluded
      ? [
          {
            key: "excluded",
            label: "Excluded",
            backgroundColor: colors.surfaceMuted,
            textColor: colors.mutedText,
          },
        ]
      : []),
    ...(isOverdue
      ? [
          {
            key: "overdue",
            label: "Overdue",
            backgroundColor: colors.badges.overdue.background,
            textColor: colors.badges.overdue.text,
          },
        ]
      : []),
    ...(entry.linkedLedgerEntryId != null
      ? [
          {
            key: "fronted",
            label: "Fronted",
            backgroundColor: colors.badges.partial.background,
            textColor: colors.badges.partial.text,
          },
        ]
      : []),
  ];
  const badges =
    isSettled || isPartial ? [statusBadge, ...nonStatusBadges] : [...nonStatusBadges, statusBadge];
  const noteOrTargetLabel = entry.note
    ? entry.note
    : targetDateLabel
      ? `Target: ${targetDateLabel}`
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show actions for ${entry.person}`}
      onPress={() => onOpenActions(entry)}
    >
      <Card
        style={{
          padding: 12,
          backgroundColor: entryBackground,
          opacity: isExcluded ? 0.75 : 1,
          borderWidth: 0,
        }}
      >
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Text style={{ fontWeight: "700", flex: 1, marginRight: 10, color: colors.text }}>
              {entry.person}
            </Text>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ fontWeight: "800", color: colors.text }}>{php.format(remaining)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {noteOrTargetLabel ? (
                <Text style={{ color: colors.mutedText }}>{noteOrTargetLabel}</Text>
              ) : null}
            </View>
            <View style={{ minWidth: 120, maxWidth: "55%", alignItems: "flex-end", flexShrink: 1 }}>
              <ReceivableBadgeGroup badges={badges} align="right" />
            </View>
          </View>
          {hasPayments ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Pressable
                accessibilityLabel={`View payment history for ${entry.person}`}
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation?.();
                  onOpenPaymentHistory(entry);
                }}
                hitSlop={6}
                style={[
                  getPillOutlineStyle(colors),
                  {
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderWidth: 0,
                    borderColor: "transparent",
                    backgroundColor: colors.surfaceAlt,
                  },
                ]}
              >
                <Text style={[getPillOutlineTextStyle(colors), { color: colors.text }]}>
                  View Payments
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
