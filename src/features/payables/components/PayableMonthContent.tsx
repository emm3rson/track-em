import React, { useMemo } from "react";
import { Pressable, View } from "react-native";

import { InnerCard } from "../../../components/ui/InnerCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Text } from "../../../components/Themed";
import { components, spacing, typography } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import { formatMonthLabel } from "../../../utils/dates";
import type { CreditRow, PayableEntryTarget } from "../types";

type PayableMonthContentProps = {
  month: string;
  platformMap: Map<string, CreditRow>;
  totals: { paid: number; remaining: number };
  context: "card" | "modal";
  onOpenEntryActions: (target: PayableEntryTarget, closeMonthDetail?: boolean) => void;
};

export function PayableMonthContent({
  month,
  platformMap,
  totals,
  context,
  onOpenEntryActions,
}: PayableMonthContentProps) {
  const { colors } = useTheme();
  const orderedPayees = useMemo(
    () =>
      Array.from(platformMap.entries())
        .sort((a, b) => {
          const statusA = a[1].status ?? "UNPAID";
          const statusB = b[1].status ?? "UNPAID";
          const rank = (status: CreditRow["status"]) => {
            if (status === "UNPAID") return 0;
            if (status === "PARTIALLY_PAID") return 1;
            return 2;
          };
          const statusRankDiff = rank(statusA) - rank(statusB);
          if (statusRankDiff !== 0) return statusRankDiff;

          const hasDueA = !!a[1].dueDate;
          const hasDueB = !!b[1].dueDate;
          if (hasDueA !== hasDueB) return hasDueA ? -1 : 1;
          const dateA = a[1].dueDate;
          const dateB = b[1].dueDate;
          if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
          return a[0].localeCompare(b[0]);
        })
        .map(([payeeName]) => payeeName),
    [platformMap]
  );
  const total = totals.paid + totals.remaining;
  const hasPaid = totals.paid > 0;
  const hasRemaining = totals.remaining > 0;
  const inModal = context === "modal";

  return (
    <View style={{ gap: spacing.xs }}>
      {orderedPayees.map((payeeName) => {
        const row = platformMap.get(payeeName);
        if (!row) return null;
        const amount = row.amount ?? 0;
        const status = row.status ?? "UNPAID";
        const dueLabel = row.dueDate
          ? new Date(row.dueDate).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })
          : null;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open actions for payable ${payeeName} in ${formatMonthLabel(month)}`}
            key={payeeName}
            onPress={(event) => {
              if (!inModal) {
                event.stopPropagation?.();
              }
              onOpenEntryActions({ month, platform: payeeName }, inModal);
            }}
          >
            <InnerCard
              style={{
                paddingVertical: components.payableRowPaddingVertical,
                paddingHorizontal: spacing.md,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  flexShrink: 1,
                  flex: 1,
                  paddingRight: spacing.sm,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.xs,
                    flexShrink: 1,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ fontWeight: "400", color: colors.text, flexShrink: 1 }}
                  >
                    {payeeName}
                  </Text>
                  <StatusBadge
                    label={
                      status === "PAID"
                        ? "Paid"
                        : status === "PARTIALLY_PAID"
                          ? "Partially Paid"
                          : "Unpaid"
                    }
                    tone={
                      status === "PAID"
                        ? "paid"
                        : status === "PARTIALLY_PAID"
                          ? "partial"
                          : "unpaid"
                    }
                    textStyle={{ fontSize: components.payableStatusFontSize }}
                  />
                </View>
                {dueLabel ? (
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.mutedText, fontSize: typography.caption }}
                  >
                    {`Due: ${dueLabel}`}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontWeight: "400", color: colors.text }}>{php.format(amount)}</Text>
            </InnerCard>
          </Pressable>
        );
      })}

      {hasPaid && hasRemaining ? (
        <>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: spacing.md,
            }}
          >
            <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
              Monthly Unpaid Total
            </Text>
            <Text style={{ fontWeight: "700", color: colors.badges.unpaid.text }}>
              {php.format(totals.remaining)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: spacing.md,
            }}
          >
            <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
              Monthly Paid Total
            </Text>
            <Text style={{ fontWeight: "700", color: colors.badges.paid.text }}>
              {php.format(totals.paid)}
            </Text>
          </View>
        </>
      ) : (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
            {hasPaid
              ? "Monthly Paid Total"
              : hasRemaining
                ? "Monthly Remaining Total"
                : "Monthly Total"}
          </Text>
          <Text
            style={{
              fontWeight: "700",
              color: hasPaid
                ? colors.badges.paid.text
                : hasRemaining
                  ? colors.badges.unpaid.text
                  : colors.text,
            }}
          >
            {php.format(hasPaid ? totals.paid : hasRemaining ? totals.remaining : total)}
          </Text>
        </View>
      )}
    </View>
  );
}
