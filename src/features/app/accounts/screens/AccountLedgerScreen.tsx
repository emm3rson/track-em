import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { ModalCard } from "../../../../components/ModalCard";
import { ModalContentCard } from "../../../../components/ModalContentCard";
import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { ModalHeaderBar } from "../../../../components/ui/ModalHeaderBar";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { InnerCard } from "../../../../components/ui/InnerCard";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { Text as ThemedText } from "../../../../components/Themed";
import { AccountSelect } from "../../../../components/ui/AccountSelect";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import { radius, spacing, typography } from "../../../../styles/tokens";
import { ledgerSourceKindBadgeLabel, ledgerSourceKindLabel } from "../../ledger/sourceKind";
import type { RootStackParamList } from "../../../../navigation/types";
import { AppScreen } from "../../../../ui/components/AppScreen";
import { useAccountLedgerScreenController } from "../hooks/useAccountLedgerScreenController";

export function AccountLedgerScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "AccountLedger">>();
  const { accountId, accountName, accountType } = route.params;

  const {
    rows,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    scrollRef,
    entryActionTarget,
    openEntryActions,
    closeEntryActions,
    showAddTransactionSheet,
    openAddTransactionSheet,
    closeAddTransactionSheet,
    addTransactionActions,
    entrySheetActions,
    editing,
    accountOptions,
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
    attemptCloseEdit,
    onSaveEdit,
  } = useAccountLedgerScreenController({ accountId, accountName, accountType });

  const inputFieldStyle = getFieldInputStyle(colors);

  return (
    <AppScreen
      loading={loading}
      loadingLabel="Loading entries..."
      scrollRef={scrollRef}
      stackHeader
    >
      <View style={styles.screenContent}>
        <ThemedText style={[styles.headerText, { color: colors.mutedText }]}>
          Transaction history for {accountName}
        </ThemedText>

        <PrimaryButton
          accessibilityRole="button"
          accessibilityLabel={`Add transaction for ${accountName}`}
          onPress={openAddTransactionSheet}
          style={styles.addTransactionButton}
        >
          Add Transaction
        </PrimaryButton>

        {rows.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText style={[styles.emptyStateTitle, { color: colors.text }]}>
              No activity yet
            </ThemedText>
            <ThemedText style={[styles.emptyStateDescription, { color: colors.mutedText }]}>
              Add transfers, log income, or link expenses to see entries here.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.rowsList}>
            {rows.map((row) => {
              const isTransfer = row.linkedTransferId != null;
              const isOutgoing = row.amount < 0;
              const amountColor = row.amount < 0 ? colors.danger : colors.success;
              const badge = ledgerSourceKindBadgeLabel(row.sourceKind);
              const noteText =
                row.note ??
                (isTransfer
                  ? isOutgoing
                    ? `Transfer to ${row.linkedTransferAccountName}`
                    : `Transfer from ${row.linkedTransferAccountName}`
                  : " ");

              return (
                <Pressable key={row.activityKey} onPress={() => openEntryActions(row)}>
                  <InnerCard style={styles.rowCard}>
                    <View style={styles.rowHeader}>
                      <Text style={[styles.rowDateText, { color: colors.text }]}>{row.date}</Text>
                      {badge ? (
                        <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
                          <Text style={[styles.badgeText, { color: colors.mutedText }]}>
                            {badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.rowBody}>
                      <Text style={[styles.rowNote, { color: colors.mutedText }]} numberOfLines={1}>
                        {noteText}
                      </Text>
                      <Text style={[styles.rowAmount, { color: amountColor }]}>
                        {php.format(row.amount)}
                      </Text>
                    </View>
                  </InnerCard>
                </Pressable>
              );
            })}
            {hasMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Load more transactions"
                onPress={loadMore}
                disabled={loadingMore}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <ThemedText style={[styles.loadMoreButtonText, { color: colors.primaryBg }]}>
                  {loadingMore ? "Loading more..." : "Load more transactions"}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <ActionBottomSheet
        visible={showAddTransactionSheet}
        title="Add Transaction"
        subtitle={accountName}
        actions={addTransactionActions}
        onClose={closeAddTransactionSheet}
        variant="grid-flat"
      />

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

      <ModalCard visible={!!editing} onRequestClose={attemptCloseEdit} useCard={false}>
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
              <Text style={[styles.editDateText, { color: colors.text }]}>
                {editDate.toLocaleDateString("en-PH")}
              </Text>
            </FieldShell>
          </Pressable>
          {showEditDate && (
            <DateTimePicker
              value={editDate}
              mode="date"
              onChange={(e, d) => {
                setShowEditDate(false);
                if (d) setEditDate(d);
              }}
            />
          )}

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
            onCancel={attemptCloseEdit}
            onSubmit={onSaveEdit}
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
    gap: spacing.xs,
  },
  headerText: {
    fontSize: 16,
  },
  emptyState: {
    padding: 20,
    borderRadius: 14,
    gap: spacing.xs,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyStateDescription: {
    fontSize: typography.body,
  },
  addTransactionButton: {
    alignSelf: "stretch",
  },
  rowsList: {
    gap: spacing.sm,
  },
  rowCard: {
    padding: 10,
    gap: 6,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowDateText: {
    fontSize: typography.body,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowNote: {
    flex: 1,
    fontSize: typography.body,
  },
  rowAmount: {
    fontWeight: "800",
  },
  editDateText: {
    fontSize: typography.body,
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
