import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { EmptyState } from "../../../components/EmptyState";
import { LoadingPlaceholder } from "../../../components/LoadingPlaceholder";
import { Card, Text } from "../../../components/Themed";
import { InnerCard } from "../../../components/ui/InnerCard";
import { ThemedSelect } from "../../../components/ui/ThemedSelect";
import { getActionShadowStyle } from "../../../styles/shadows";
import { spacing } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { php } from "../../../utils/currency";
import type { RecentCashflowsPhase } from "../hooks/useRecentCashflowsController";
import type { CashflowFilterAccountRow, RecentCashflowRow } from "../types";

export type RecentCashflowsSectionProps = {
  filterAccounts: CashflowFilterAccountRow[];
  filterAccountId: number | null;
  rows: RecentCashflowRow[];
  phase: RecentCashflowsPhase;
  hasMore: boolean;
  reservedBodyMinHeight: number;
  onBodyLayout: (event: LayoutChangeEvent) => void;
  onChangeFilterAccount: (accountId: number | null) => void;
  onLoadMore: () => void;
  onPressRow: (tx: RecentCashflowRow) => void;
  onFocusAddEntry: () => void;
  onRetry: () => void;
  errorMessage: string | null;
};

export function RecentCashflowsSection({
  filterAccounts,
  filterAccountId,
  rows,
  phase,
  hasMore,
  reservedBodyMinHeight,
  onBodyLayout,
  onChangeFilterAccount,
  onLoadMore,
  onPressRow,
  onFocusAddEntry,
  onRetry,
  errorMessage,
}: RecentCashflowsSectionProps) {
  const { colors } = useTheme();
  const actionShadowStyle = getActionShadowStyle(colors);

  const filterItems = useMemo(() => {
    return [
      { label: "All accounts", value: "all" as number | "all" },
      ...filterAccounts.map((account) => ({
        label: `${account.name} (${account.type === "SOURCE" ? "Wallet" : "Savings"} - ${php.format(account.balance)})`,
        value: account.id as number | "all",
      })),
    ];
  }, [filterAccounts]);

  const selectedRecentFilterAccount =
    filterAccountId == null ? null : (filterAccounts.find((a) => a.id === filterAccountId) ?? null);

  const showFilterLoading = phase === "filter_loading";
  const showLoadMoreLoading = phase === "loading_more";

  return (
    <Card variant="section" style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Recent Cashflows</Text>
      <Text style={styles.filterLabel}>Filter by account</Text>
      <ThemedSelect
        accessibilityLabel="Filter recent cashflows by account"
        selectedValue={filterAccountId ?? "all"}
        onValueChange={(value) => onChangeFilterAccount(value === "all" ? null : (value as number))}
        items={filterItems}
      />

      <View
        onLayout={onBodyLayout}
        style={[styles.bodyContainer, { minHeight: reservedBodyMinHeight || undefined }]}
      >
        {showFilterLoading ? (
          <LoadingPlaceholder label="Loading cashflows..." />
        ) : phase === "error" ? (
          <EmptyState
            title="Unable to load cashflows"
            description={errorMessage ?? "Please try again."}
            actionLabel="Try Again"
            onActionPress={onRetry}
          />
        ) : rows.length === 0 ? (
          filterAccountId == null ? (
            <EmptyState
              title="No recent activity yet"
              description="Add a savings cashflow entry or record receivable/payable payments linked to a wallet."
              actionLabel="Add Cashflow Entry"
              onActionPress={onFocusAddEntry}
            />
          ) : (
            <EmptyState
              title={
                selectedRecentFilterAccount
                  ? `No activity for ${selectedRecentFilterAccount.name}`
                  : "No activity for this account"
              }
              description="Try another account filter or add account activity."
              actionLabel="Show All Accounts"
              onActionPress={() => onChangeFilterAccount(null)}
            />
          )
        ) : (
          <>
            {rows.map((tx) => {
              const amountColor = tx.amount < 0 ? colors.danger : colors.success;
              return (
                <Pressable key={tx.activityKey} onPress={() => onPressRow(tx)}>
                  <InnerCard style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.dateText}>{tx.date}</Text>
                      <Text style={styles.accountText}>{tx.accountName}</Text>
                    </View>
                    <View style={styles.entryBody}>
                      <View style={styles.entryMetaRow}>
                        {tx.linkedExpenseId != null ? (
                          <View style={[styles.linkChip, { backgroundColor: colors.surfaceMuted }]}>
                            <Text style={[styles.linkChipLabel, { color: colors.mutedText }]}>
                              Expense-linked
                            </Text>
                          </View>
                        ) : tx.linkedReceivablePaymentId != null ? (
                          <View style={[styles.linkChip, { backgroundColor: colors.surfaceMuted }]}>
                            <Text style={[styles.linkChipLabel, { color: colors.mutedText }]}>
                              Receivable-linked
                            </Text>
                          </View>
                        ) : tx.linkedPayablePaymentId != null ? (
                          <View style={[styles.linkChip, { backgroundColor: colors.surfaceMuted }]}>
                            <Text style={[styles.linkChipLabel, { color: colors.mutedText }]}>
                              Payable-linked
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          style={[styles.noteText, { color: colors.mutedText }]}
                          numberOfLines={1}
                        >
                          {tx.note ?? " "}
                        </Text>
                      </View>
                      <Text style={[styles.amountText, { color: amountColor }]}>
                        {php.format(tx.amount ?? 0)}
                      </Text>
                    </View>
                  </InnerCard>
                </Pressable>
              );
            })}

            {hasMore || showLoadMoreLoading ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Load more cashflow entries"
                onPress={onLoadMore}
                disabled={showLoadMoreLoading || showFilterLoading}
                style={[
                  styles.loadMoreButton,
                  actionShadowStyle,
                  {
                    backgroundColor: colors.surfaceAlt,
                    opacity: showLoadMoreLoading || showFilterLoading ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.loadMoreText, { color: colors.text }]}>
                  {showLoadMoreLoading ? "Loading..." : "Load More"}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  filterLabel: {
    fontWeight: "700",
  },
  bodyContainer: {
    gap: spacing.sm,
  },
  entryCard: {
    padding: 10,
    gap: 6,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
  },
  accountText: {
    fontSize: 14,
  },
  entryBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  linkChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  linkChipLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  noteText: {
    flex: 1,
  },
  amountText: {
    fontWeight: "800",
  },
  loadMoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "center",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 999,
  },
  loadMoreText: {
    fontWeight: "700",
  },
});
