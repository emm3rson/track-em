import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ModalCard } from "../../../../components/ModalCard";
import { ModalContentCard } from "../../../../components/ModalContentCard";
import { Text } from "../../../../components/Themed";
import { EmptyState } from "../../../../components/EmptyState";
import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { AccountSelect } from "../../../../components/ui/AccountSelect";
import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { InnerCard } from "../../../../components/ui/InnerCard";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../../components/ui/ModalHeaderBar";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { ThemedSelect } from "../../../../components/ui/ThemedSelect";
import { radius, spacing, typography } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import { ledgerSourceKindLabel } from "../../ledger/sourceKind";
import { AppScreen } from "../../../../ui/components/AppScreen";
import { useTransactionHistoryScreenController } from "../hooks/useTransactionHistoryScreenController";
import type { TransactionHistoryDatePreset } from "../types";

type PresetOption = {
  label: string;
  value: TransactionHistoryDatePreset;
};

const DATE_PRESET_OPTIONS: PresetOption[] = [
  { label: "Last 7 days", value: "LAST_7_DAYS" },
  { label: "Last 30 days", value: "LAST_30_DAYS" },
  { label: "All time", value: "ALL_TIME" },
  { label: "Custom range", value: "CUSTOM" },
];

export function TransactionHistoryScreen() {
  const { colors } = useTheme();
  const inputFieldStyle = getFieldInputStyle(colors);

  const {
    scrollRef,
    rows,
    loading,
    loadingMore,
    loadedOnce,
    hasMore,
    errorMessage,
    refresh,
    loadMore,
    accountOptions,
    selectedAccountId,
    changeAccountFilter,
    datePreset,
    changeDatePreset,
    customFromDate,
    customToDate,
    changeCustomFromDate,
    changeCustomToDate,
    showFromDatePicker,
    setShowFromDatePicker,
    showToDatePicker,
    setShowToDatePicker,
    entryActionTarget,
    openEntryActions,
    closeEntryActions,
    entrySheetActions,
    editingEntry,
    editAccountId,
    setEditAccountId,
    editDirection,
    setEditDirection,
    editAmountText,
    setEditAmountText,
    editNote,
    setEditNote,
    editDate,
    setEditDate,
    showEditDate,
    setShowEditDate,
    savingEdit,
    attemptCloseEditModal,
    saveEdit,
  } = useTransactionHistoryScreenController();

  return (
    <AppScreen
      loading={loading && !loadedOnce}
      loadingLabel="Loading transaction history..."
      stackHeader
      scrollRef={scrollRef}
      contentContainerStyle={styles.screenContent}
    >
      <SectionCard style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filters</Text>

        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.text }]}>Date range</Text>
          <ThemedSelect
            accessibilityLabel="Filter by date range"
            selectedValue={datePreset}
            onValueChange={changeDatePreset}
            items={DATE_PRESET_OPTIONS}
          />
        </View>

        {datePreset === "CUSTOM" ? (
          <View style={styles.customDateRow}>
            <View style={styles.customDateColumn}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>From</Text>
              <Pressable onPress={() => setShowFromDatePicker(true)}>
                <FieldShell>
                  <Text style={[styles.dateValueText, { color: colors.text }]}>
                    {customFromDate.toLocaleDateString("en-PH")}
                  </Text>
                </FieldShell>
              </Pressable>
              {showFromDatePicker ? (
                <DateTimePicker
                  value={customFromDate}
                  mode="date"
                  onChange={(_event, value) => {
                    setShowFromDatePicker(false);
                    if (value) {
                      changeCustomFromDate(value);
                    }
                  }}
                />
              ) : null}
            </View>

            <View style={styles.customDateColumn}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>To</Text>
              <Pressable onPress={() => setShowToDatePicker(true)}>
                <FieldShell>
                  <Text style={[styles.dateValueText, { color: colors.text }]}>
                    {customToDate.toLocaleDateString("en-PH")}
                  </Text>
                </FieldShell>
              </Pressable>
              {showToDatePicker ? (
                <DateTimePicker
                  value={customToDate}
                  mode="date"
                  onChange={(_event, value) => {
                    setShowToDatePicker(false);
                    if (value) {
                      changeCustomToDate(value);
                    }
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.text }]}>Account</Text>
          <AccountSelect
            accessibilityLabel="Filter transaction history by account"
            accounts={accountOptions}
            selectedValue={selectedAccountId ?? "all"}
            onValueChange={(value) =>
              changeAccountFilter(value === "all" ? null : (value as number))
            }
            leadingItems={[{ label: "All accounts", value: "all" as number | "all" }]}
            labelFn={(a) => `${a.name} (${a.type === "SOURCE" ? "Wallet" : "Savings"})`}
          />
        </View>
      </SectionCard>

      <SectionCard style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>

        {errorMessage ? (
          <EmptyState
            title="Unable to load transaction history"
            description={errorMessage}
            actionLabel="Try Again"
            onActionPress={refresh}
          />
        ) : rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No transactions in this range
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedText }]}>
              Try another date range or account filter.
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {rows.map((row) => {
              const amountColor = row.amount < 0 ? colors.danger : colors.success;
              const sourceLabel = ledgerSourceKindLabel(row.sourceKind);
              const title = row.note?.trim() ? row.note.trim() : sourceLabel;

              return (
                <Pressable
                  key={row.activityKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Open actions for ${title}`}
                  onPress={() => openEntryActions(row)}
                >
                  <InnerCard style={styles.transactionCard}>
                    <View style={styles.transactionRow}>
                      <Text
                        style={[styles.transactionTitle, { color: colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {title}
                      </Text>
                      <Text style={[styles.transactionAmount, { color: amountColor }]}>
                        {php.format(row.amount)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.transactionMeta, { color: colors.mutedText }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {row.date} - {row.accountName}
                    </Text>
                    <View style={[styles.sourceChip, { backgroundColor: colors.surfaceMuted }]}>
                      <Text style={[styles.sourceChipText, { color: colors.mutedText }]}>
                        {sourceLabel}
                      </Text>
                    </View>
                  </InnerCard>
                </Pressable>
              );
            })}

            {hasMore || loadingMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Load more transactions"
                onPress={loadMore}
                disabled={loadingMore || loading}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surfaceAlt,
                    opacity: loadingMore || loading ? 0.65 : 1,
                  },
                ]}
              >
                <Text style={[styles.loadMoreButtonText, { color: colors.text }]}>
                  {loadingMore ? "Loading..." : "Load More"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </SectionCard>

      <ActionBottomSheet
        visible={!!entryActionTarget}
        title={
          entryActionTarget?.note?.trim() ||
          ledgerSourceKindLabel(entryActionTarget?.sourceKind ?? "MANUAL_ACCOUNT_ENTRY")
        }
        subtitle={
          entryActionTarget
            ? `${php.format(entryActionTarget.amount)} - ${entryActionTarget.date} - ${entryActionTarget.accountName}`
            : undefined
        }
        actions={entrySheetActions}
        onClose={closeEntryActions}
      />

      <ModalCard visible={!!editingEntry} onRequestClose={attemptCloseEditModal} useCard={false}>
        <ModalContentCard>
          <ModalHeaderBar title="Edit Transaction" actions={[]} />

          {editAccountId != null ? (
            <>
              <FormLabel>Account</FormLabel>
              <AccountSelect
                accessibilityLabel="Transaction account"
                accounts={accountOptions}
                selectedValue={editAccountId}
                onValueChange={(value) => setEditAccountId(value as number)}
              />
            </>
          ) : null}

          <FormLabel>Date</FormLabel>
          <Pressable onPress={() => setShowEditDate(true)}>
            <FieldShell>
              <Text style={[styles.dateValueText, { color: colors.text }]}>
                {editDate.toLocaleDateString("en-PH")}
              </Text>
            </FieldShell>
          </Pressable>
          {showEditDate ? (
            <DateTimePicker
              value={editDate}
              mode="date"
              onChange={(_event, value) => {
                setShowEditDate(false);
                if (value) setEditDate(value);
              }}
            />
          ) : null}

          <FormLabel>Type</FormLabel>
          <View style={styles.directionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expense outflow"
              onPress={() => setEditDirection("outflow")}
              style={[
                styles.directionButton,
                editDirection === "outflow"
                  ? { backgroundColor: colors.danger, borderColor: colors.danger }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.directionText,
                  {
                    color: editDirection === "outflow" ? colors.surface : colors.mutedText,
                  },
                ]}
              >
                Expense (−)
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Income inflow"
              onPress={() => setEditDirection("inflow")}
              style={[
                styles.directionButton,
                editDirection === "inflow"
                  ? { backgroundColor: colors.success, borderColor: colors.success }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.directionText,
                  {
                    color: editDirection === "inflow" ? colors.surface : colors.mutedText,
                  },
                ]}
              >
                Income (+)
              </Text>
            </Pressable>
          </View>

          <FormLabel>Amount</FormLabel>
          <FieldShell>
            <TextInput
              accessibilityLabel="Transaction amount"
              value={editAmountText}
              onChangeText={setEditAmountText}
              placeholder="e.g. 500.00"
              placeholderTextColor={colors.placeholderText}
              keyboardType="decimal-pad"
              underlineColorAndroid="transparent"
              style={inputFieldStyle}
            />
          </FieldShell>

          <FormLabel optional>Notes</FormLabel>
          <FieldShell>
            <TextInput
              accessibilityLabel="Transaction notes"
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Optional note"
              placeholderTextColor={colors.placeholderText}
              underlineColorAndroid="transparent"
              style={inputFieldStyle}
            />
          </FieldShell>

          <ModalFormActions
            onCancel={attemptCloseEditModal}
            onSubmit={() => void saveEdit()}
            submitLoading={savingEdit}
            submitDisabled={savingEdit}
          />
        </ModalContentCard>
      </ModalCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
  },
  sectionCard: {
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  filterLabel: {
    fontWeight: "700",
  },
  dateValueText: {
    fontSize: typography.body,
  },
  filterGroup: {
    gap: 8,
  },
  customDateRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  customDateColumn: {
    flex: 1,
    gap: 6,
  },
  transactionsList: {
    gap: 8,
  },
  emptyState: {
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyDescription: {
    fontSize: typography.body,
  },
  transactionCard: {
    padding: 10,
    gap: 6,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  transactionTitle: {
    fontWeight: "700",
    flex: 1,
  },
  transactionAmount: {
    fontWeight: "800",
  },
  transactionMeta: {
    fontSize: typography.body,
  },
  sourceChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourceChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  loadMoreButton: {
    alignSelf: "center",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loadMoreButtonText: {
    fontWeight: "700",
  },
  directionRow: {
    flexDirection: "row",
    gap: 8,
  },
  directionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  directionText: {
    fontSize: typography.body,
    fontWeight: "700",
  },
});
