import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "../../../../components/Themed";
import { EmptyState } from "../../../../components/EmptyState";
import { InlinePillAction } from "../../../../components/ui/InlinePillAction";
import { InnerCard } from "../../../../components/ui/InnerCard";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { TransactionHistoryIconButton } from "../../../../components/ui/TransactionHistoryIconButton";
import { spacing, typography } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import { colorForExpenseCategory } from "../../../../features/expenses/chartPalette";
import type { ExpenseEntry } from "../types";

type ExpenseListSectionProps = {
  emptyExpenses: boolean;
  filteredExpenses: ExpenseEntry[];
  categoryFilterId: number | null;
  onResetFilter: () => void;
  onOpenEntryActions: (expense: ExpenseEntry) => void;
  onPressOpenTransactionHistory: () => void;
};

export function ExpenseListSection({
  emptyExpenses,
  filteredExpenses,
  categoryFilterId,
  onResetFilter,
  onOpenEntryActions,
  onPressOpenTransactionHistory,
}: ExpenseListSectionProps) {
  const { colors } = useTheme();

  return (
    <SectionCard style={styles.sectionCard}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses History</Text>
        <View style={styles.headerActions}>
          {categoryFilterId ? (
            <InlinePillAction compact label="Reset Filter" onPress={onResetFilter} />
          ) : null}
          <TransactionHistoryIconButton onPress={onPressOpenTransactionHistory} />
        </View>
      </View>

      {emptyExpenses ? (
        <EmptyState
          embedded
          title="No expenses yet"
          description="Tap the + button to log your first expense."
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          embedded
          title="No expenses in this category"
          description="No expenses found for this category."
          actionLabel="Reset Filter"
          onActionPress={onResetFilter}
        />
      ) : (
        <View style={styles.list}>
          {filteredExpenses.map((expense) => (
            <Pressable
              key={expense.id}
              accessibilityRole="button"
              accessibilityLabel={`Actions for expense ${expense.categoryName}`}
              onPress={() => onOpenEntryActions(expense)}
            >
              <InnerCard style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <Text
                    style={[styles.itemTitle, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {expense.categoryName}
                  </Text>
                  <Text
                    style={[
                      styles.amountText,
                      { color: colorForExpenseCategory(expense.categoryId, colors) },
                    ]}
                  >
                    {php.format(expense.amount ?? 0)}
                  </Text>
                </View>
                <View style={styles.itemBottomRow}>
                  <View style={styles.itemMetaColumn}>
                    {expense.note?.startsWith("Payable payment:") ? (
                      <Text style={[styles.linkedPayableBadge, { color: colors.primaryText }]}>
                        From Payable
                      </Text>
                    ) : null}
                    {expense.accountName ? (
                      <Text
                        style={[styles.accountMetaText, { color: colors.mutedText }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        From: {expense.accountName}
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.noteText, { color: colors.mutedText }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {expense.note ?? ""}
                    </Text>
                  </View>
                  <Text style={[styles.dateText, { color: colors.mutedText }]}>{expense.date}</Text>
                </View>
              </InnerCard>
            </Pressable>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyState: {
    gap: spacing.xxs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyDescription: {
    fontSize: typography.body,
  },
  emptyDescriptionWithAction: {
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  itemCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: spacing.xxs,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    fontWeight: "700",
    flex: 1,
    marginRight: spacing.xs,
  },
  amountText: {
    fontWeight: "600",
  },
  itemBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemMetaColumn: {
    flex: 1,
    marginRight: spacing.xs,
    gap: 2,
  },
  accountMetaText: {
    fontSize: 11,
  },
  linkedPayableBadge: {
    fontSize: 10,
    fontWeight: "700",
  },
  noteText: {
    fontSize: typography.body,
  },
  dateText: {
    fontSize: typography.body,
  },
});
