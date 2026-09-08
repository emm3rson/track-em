import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ModalCard } from "../../../../components/ModalCard";
import { ModalContentCard } from "../../../../components/ModalContentCard";
import { Text as ThemedText } from "../../../../components/Themed";
import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { FieldShell, getFieldInputStyle } from "../../../../components/ui/FieldShell";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { InlinePillAction } from "../../../../components/ui/InlinePillAction";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../../components/ui/ModalHeaderBar";
import { AccountSelect } from "../../../../components/ui/AccountSelect";
import { ThemedSelect } from "../../../../components/ui/ThemedSelect";
import { getPillOutlineStyle, getPillOutlineTextStyle } from "../../../../styles/buttons";
import { radius, spacing } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { formatMonthLabel } from "../../../../utils/dates";
import { CheckSquare, RotateCcw, Square } from "lucide-react-native";
import { ArchivedMonthsModal } from "../../../../features/payables/components/ArchivedMonthsModal";
import { PayableAddPaymentModal } from "../../../../features/payables/components/PayableAddPaymentModal";
import { PaymentHistoryModal as PayablePaymentHistoryModal } from "../../../../features/payables/components/PaymentHistoryModal";
import { EditPaymentModal as EditPayablePaymentModal } from "../../../../features/payables/components/EditPaymentModal";
import { EntryDateField } from "../../entry/components/EntryDateField";
import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { CreditRow, PayablePaymentAccountRow } from "../../../../features/payables/types";
import type { PayablePaymentRow } from "../../../../features/payables/types";
import type { PayableEntryTarget } from "../types";

type Props = {
  // Add month modal
  showAddMonthModal: boolean;
  setShowAddMonthModal: (show: boolean) => void;
  onAddCurrentMonth: () => void;
  onAddNextMonth: () => void;
  onAddCustomMonth: () => void;
  customMonthInput: string;
  setCustomMonthInput: (v: string) => void;
  addingMonth: boolean;
  isRestoringNextMonth: boolean;
  // Month actions sheet
  monthActionsTarget: string | null;
  setMonthActionsTarget: (target: string | null) => void;
  monthActionsSheetActions: ActionBottomSheetAction[];
  // Entry actions sheet
  payablesEntryActionTarget: PayableEntryTarget | null;
  setPayablesEntryActionTarget: (target: PayableEntryTarget | null) => void;
  payableEntryActions: ActionBottomSheetAction[];
  // Duplicate modal
  showDuplicateEntryModal: boolean;
  duplicateEntryTarget: PayableEntryTarget | null;
  duplicateTargetMonths: string[];
  duplicateTargetMonthOptions: { label: string; value: string; disabled?: boolean }[];
  toggleDuplicateTargetMonth: (month: string) => void;
  closeDuplicateEntryModal: () => void;
  submitDuplicateEntry: () => void;
  isSubmittingDuplicateEntry: boolean;
  // Add payment modal
  addPaymentTarget: PayableEntryTarget | null;
  isFabPayablePaymentFlow: boolean;
  fabPayableMonthOptions: { label: string; value: string }[];
  fabPayableEntryOptions: { label: string; value: string }[];
  fabPayableMonth: string;
  fabPayablePlatform: string;
  handleFabPayableMonthChange: (month: string) => void;
  handleFabPayablePlatformChange: (platform: string) => void;
  fabPayableAmountPlaceholder: string;
  selectedAmountPlaceholder: string;
  selectedRemainingAmount: number;
  selectedPreferredAccountId: number | null;
  paymentAccounts: PayablePaymentAccountRow[];
  paymentCategories: { id: number; name: string }[];
  loadingPaymentCategories: boolean;
  paymentCategoryId: number | null;
  setPaymentCategoryId: (id: number | null) => void;
  loadingPaymentAccounts: boolean;
  paymentDate: Date;
  setPaymentDate: (date: Date) => void;
  minPaymentDate: Date | undefined;
  maxPaymentDate: Date | undefined;
  savingPayment: boolean;
  closeAddPaymentModal: () => void;
  handleRecordPayablePayment: (
    amount: number,
    accountId?: number | null,
    targetOverride?: PayableEntryTarget | null
  ) => void;
  // Archives modal
  showArchives: boolean;
  setShowArchives: (show: boolean) => void;
  archivedMonths: string[];
  statusTotalsByMonth: Map<string, { paid: number; remaining: number }>;
  autoArchivedSet: Set<string>;
  restoringMonth: string | null;
  restoreMonthAction: (month: string) => void;
  handleDeleteArchivedMonth: (month: string) => void;
  // Payment history modal
  showPaymentHistoryModal: boolean;
  paymentHistoryEntry: CreditRow | null;
  paymentHistory: PayablePaymentRow[];
  loadingPayments: boolean;
  closePaymentHistoryModal: () => void;
  editingPayment: PayablePaymentRow | null;
  setEditingPayment: (payment: PayablePaymentRow | null) => void;
  closeEditPaymentModal: () => void;
  handleUpdatePayment: (payment: PayablePaymentRow, amount: number, paymentDateIso: string) => void;
  confirmDeletePayment: (payment: PayablePaymentRow) => void;
  // Edit payable modal
  payablesEditing: PayableEntryTarget | null;
  payablesEditAmount: string;
  setPayablesEditAmount: (v: string) => void;
  payablesEditDueDate: Date | null;
  setPayablesEditDueDate: (v: Date | null) => void;
  payablesEditCategoryId: number | null;
  setPayablesEditCategoryId: (v: number | null) => void;
  payablesEditPreferredAccountId: number | null;
  setPayablesEditPreferredAccountId: (v: number | null) => void;
  payablesEditPlatform: string;
  setPayablesEditPlatform: (v: string) => void;
  payablesEditCategories: { id: number; name: string }[];
  payablesEditAccounts: PayablePaymentAccountRow[];
  loadingPayablesEditCategories: boolean;
  loadingPayablesEditAccounts: boolean;
  payablesEditMinDueDate: Date;
  payablesEditMaxDueDate: Date;
  attemptClosePayablesEdit: () => void;
  savePayablesEdit: () => void;
};

export function ObligationsPayablesModals({
  showAddMonthModal,
  setShowAddMonthModal,
  onAddCurrentMonth,
  onAddNextMonth,
  onAddCustomMonth,
  customMonthInput,
  setCustomMonthInput,
  addingMonth,
  isRestoringNextMonth,
  monthActionsTarget,
  setMonthActionsTarget,
  monthActionsSheetActions,
  payablesEntryActionTarget,
  setPayablesEntryActionTarget,
  payableEntryActions,
  showDuplicateEntryModal,
  duplicateEntryTarget,
  duplicateTargetMonths,
  duplicateTargetMonthOptions,
  toggleDuplicateTargetMonth,
  closeDuplicateEntryModal,
  submitDuplicateEntry,
  isSubmittingDuplicateEntry,
  addPaymentTarget,
  isFabPayablePaymentFlow,
  fabPayableMonthOptions,
  fabPayableEntryOptions,
  fabPayableMonth,
  fabPayablePlatform,
  handleFabPayableMonthChange,
  handleFabPayablePlatformChange,
  fabPayableAmountPlaceholder,
  selectedAmountPlaceholder,
  selectedRemainingAmount,
  selectedPreferredAccountId,
  paymentAccounts,
  paymentCategories,
  loadingPaymentCategories,
  paymentCategoryId,
  setPaymentCategoryId,
  loadingPaymentAccounts,
  paymentDate,
  setPaymentDate,
  minPaymentDate,
  maxPaymentDate,
  savingPayment,
  closeAddPaymentModal,
  handleRecordPayablePayment,
  showArchives,
  setShowArchives,
  archivedMonths,
  statusTotalsByMonth,
  autoArchivedSet,
  restoringMonth,
  restoreMonthAction,
  handleDeleteArchivedMonth,
  showPaymentHistoryModal,
  paymentHistoryEntry,
  paymentHistory,
  loadingPayments,
  closePaymentHistoryModal,
  editingPayment,
  setEditingPayment,
  closeEditPaymentModal,
  handleUpdatePayment,
  confirmDeletePayment,
  payablesEditing,
  payablesEditAmount,
  setPayablesEditAmount,
  payablesEditDueDate,
  setPayablesEditDueDate,
  payablesEditCategoryId,
  setPayablesEditCategoryId,
  payablesEditPreferredAccountId,
  setPayablesEditPreferredAccountId,
  payablesEditPlatform,
  setPayablesEditPlatform,
  payablesEditCategories,
  payablesEditAccounts,
  loadingPayablesEditCategories,
  loadingPayablesEditAccounts,
  payablesEditMinDueDate,
  payablesEditMaxDueDate,
  attemptClosePayablesEdit,
  savePayablesEdit,
}: Props) {
  const { colors } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);

  return (
    <>
      {/* Add Month Modal */}
      <ModalCard
        visible={showAddMonthModal}
        onRequestClose={() => setShowAddMonthModal(false)}
        useCard={false}
      >
        <ModalContentCard>
          <ModalHeaderBar title="Add Month" />

          <View style={styles.monthPresetRow}>
            <InlinePillAction
              label="Current Month"
              onPress={onAddCurrentMonth}
              disabled={addingMonth}
              style={styles.monthPresetPill}
              textStyle={getPillOutlineTextStyle(colors)}
            />
            <View
              style={[
                getPillOutlineStyle(colors),
                styles.monthPresetPill,
                styles.nextMonthPill,
                addingMonth ? styles.disabledPill : null,
              ]}
            >
              {isRestoringNextMonth ? (
                <>
                  <RotateCcw size={18} color={colors.icon} />
                  <ThemedText style={getPillOutlineTextStyle(colors)}>
                    Restoring from archive...
                  </ThemedText>
                  <ActivityIndicator size="small" color={colors.text} />
                </>
              ) : (
                <Pressable onPress={onAddNextMonth} disabled={addingMonth}>
                  <ThemedText style={getPillOutlineTextStyle(colors)}>Next Month</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          <FormLabel>Custom month (YYYY-MM)</FormLabel>
          <FieldShell>
            <TextInput
              accessibilityLabel="Custom payable month"
              value={customMonthInput}
              onChangeText={setCustomMonthInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="2026-02"
              placeholderTextColor={colors.placeholderText}
              style={fieldInputStyle}
            />
          </FieldShell>

          <ModalFormActions
            onCancel={() => setShowAddMonthModal(false)}
            onSubmit={onAddCustomMonth}
            submitLabel={addingMonth ? "Adding..." : "Add Custom Month"}
            cancelDisabled={addingMonth}
            submitDisabled={addingMonth}
          />
        </ModalContentCard>
      </ModalCard>

      {/* Month Actions Sheet */}
      <ActionBottomSheet
        visible={!!monthActionsTarget}
        title="Month Actions"
        subtitle={monthActionsTarget ? formatMonthLabel(monthActionsTarget) : undefined}
        actions={monthActionsSheetActions}
        onClose={() => setMonthActionsTarget(null)}
      />

      {/* Entry Actions Sheet */}
      <ActionBottomSheet
        visible={!!payablesEntryActionTarget}
        title={
          payablesEntryActionTarget
            ? `Actions for ${payablesEntryActionTarget.platform}`
            : "Payable Actions"
        }
        subtitle={
          payablesEntryActionTarget ? formatMonthLabel(payablesEntryActionTarget.month) : undefined
        }
        actions={payableEntryActions}
        onClose={() => setPayablesEntryActionTarget(null)}
      />

      {/* Duplicate Entry Modal */}
      <ModalCard
        visible={showDuplicateEntryModal}
        onRequestClose={closeDuplicateEntryModal}
        useCard={false}
      >
        <ModalContentCard>
          <ModalHeaderBar
            title="Duplicate Payable"
            subtitle={
              duplicateEntryTarget
                ? `${duplicateEntryTarget.platform} - ${formatMonthLabel(duplicateEntryTarget.month)}`
                : undefined
            }
          />

          <FormLabel>Target month</FormLabel>
          <ScrollView
            style={styles.duplicateMonthList}
            contentContainerStyle={styles.duplicateMonthListContent}
          >
            {duplicateTargetMonthOptions.map((option) => {
              const checked = duplicateTargetMonths.includes(option.value);
              const disabled = !!option.disabled;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Duplicate to ${option.label}`}
                  accessibilityState={{ checked, disabled: disabled || isSubmittingDuplicateEntry }}
                  onPress={() => {
                    if (disabled || isSubmittingDuplicateEntry) return;
                    toggleDuplicateTargetMonth(option.value);
                  }}
                  style={[
                    styles.duplicateMonthRow,
                    { borderColor: colors.border },
                    checked ? { backgroundColor: colors.surfaceAlt } : null,
                    disabled ? styles.disabledPill : null,
                  ]}
                >
                  {checked ? (
                    <CheckSquare size={20} color={disabled ? colors.mutedText : colors.text} />
                  ) : (
                    <Square size={20} color={disabled ? colors.mutedText : colors.text} />
                  )}
                  <View style={styles.duplicateMonthRowTextWrap}>
                    <ThemedText style={{ color: disabled ? colors.mutedText : colors.text }}>
                      {option.label}
                    </ThemedText>
                    {disabled ? (
                      <ThemedText style={{ color: colors.mutedText, fontSize: 12 }}>
                        Payable already exists for this month
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <ModalFormActions
            onCancel={closeDuplicateEntryModal}
            onSubmit={() => {
              void submitDuplicateEntry();
            }}
            submitLabel={isSubmittingDuplicateEntry ? "Duplicating..." : "Duplicate"}
            cancelDisabled={isSubmittingDuplicateEntry}
            submitDisabled={isSubmittingDuplicateEntry || duplicateTargetMonths.length === 0}
          />
        </ModalContentCard>
      </ModalCard>

      {/* Add Payment Modal */}
      <PayableAddPaymentModal
        visible={!!addPaymentTarget}
        target={addPaymentTarget}
        selectableTarget={isFabPayablePaymentFlow}
        targetMonthOptions={fabPayableMonthOptions}
        targetEntryOptions={fabPayableEntryOptions}
        selectedMonth={fabPayableMonth}
        selectedPlatform={fabPayablePlatform}
        onChangeMonth={handleFabPayableMonthChange}
        onChangePlatform={handleFabPayablePlatformChange}
        amountPlaceholder={
          isFabPayablePaymentFlow ? fabPayableAmountPlaceholder : selectedAmountPlaceholder
        }
        remainingAmount={selectedRemainingAmount}
        accounts={paymentAccounts}
        categories={paymentCategories}
        loadingCategories={loadingPaymentCategories}
        categoryId={paymentCategoryId}
        onChangeCategoryId={setPaymentCategoryId}
        loadingAccounts={loadingPaymentAccounts}
        initialAccountId={selectedPreferredAccountId}
        paymentDate={paymentDate}
        onChangePaymentDate={setPaymentDate}
        minimumPaymentDate={minPaymentDate}
        maximumPaymentDate={maxPaymentDate}
        savingPayment={savingPayment}
        onClose={closeAddPaymentModal}
        onRecordPayment={(amount, accountId) => {
          if (isFabPayablePaymentFlow) {
            void handleRecordPayablePayment(amount, accountId, {
              month: fabPayableMonth,
              platform: fabPayablePlatform,
            });
            return;
          }
          void handleRecordPayablePayment(amount, accountId);
        }}
      />

      {/* Archived Months Modal */}
      <ArchivedMonthsModal
        visible={showArchives}
        onRequestClose={() => setShowArchives(false)}
        archivedMonths={archivedMonths}
        statusTotalsByMonth={statusTotalsByMonth}
        autoArchivedSet={autoArchivedSet}
        restoringMonth={restoringMonth}
        onRestoreMonth={restoreMonthAction}
        onDeleteMonth={handleDeleteArchivedMonth}
      />

      {/* Payment History Modal */}
      <PayablePaymentHistoryModal
        visible={showPaymentHistoryModal}
        entry={paymentHistoryEntry}
        payments={paymentHistory}
        loadingPayments={loadingPayments}
        savingPayment={savingPayment}
        onClose={closePaymentHistoryModal}
        onEditPayment={setEditingPayment}
        onDeletePayment={confirmDeletePayment}
      />

      {/* Edit Payment Modal */}
      <EditPayablePaymentModal
        visible={!!editingPayment}
        payment={editingPayment}
        remainingTotal={
          paymentHistoryEntry
            ? paymentHistoryEntry.amount -
              paymentHistoryEntry.paidAmount +
              (editingPayment?.amount ?? 0)
            : 0
        }
        saving={savingPayment}
        onClose={closeEditPaymentModal}
        onSave={handleUpdatePayment}
      />

      {/* Edit Payable Modal */}
      <ModalCard
        visible={!!payablesEditing}
        onRequestClose={attemptClosePayablesEdit}
        useCard={false}
      >
        <ModalContentCard>
          <ModalHeaderBar
            title="Edit Payable"
            subtitle={
              payablesEditing
                ? `${payablesEditPlatform || payablesEditing.platform} - ${formatMonthLabel(payablesEditing.month)}`
                : undefined
            }
          />

          <FormLabel>Payable Name</FormLabel>
          <FieldShell>
            <TextInput
              accessibilityLabel="Edit payable name"
              value={payablesEditPlatform}
              onChangeText={setPayablesEditPlatform}
              style={fieldInputStyle}
              placeholder="Enter payable name"
            />
          </FieldShell>

          <FormLabel>Amount</FormLabel>
          <FieldShell>
            <TextInput
              accessibilityLabel="Edit payable amount"
              value={payablesEditAmount}
              onChangeText={setPayablesEditAmount}
              keyboardType="decimal-pad"
              style={fieldInputStyle}
            />
          </FieldShell>

          <EntryDateField
            label="Due date"
            value={payablesEditDueDate}
            onChange={setPayablesEditDueDate}
            accessibilityLabel="Edit payable due date"
            optional
            placeholder="Not set"
            clearable
            clearAccessibilityLabel="Clear payable due date"
            minimumDate={payablesEditMinDueDate}
            maximumDate={payablesEditMaxDueDate}
          />

          <FormLabel optional>Expense Category</FormLabel>
          <ThemedSelect
            selectedValue={payablesEditCategoryId ?? "none"}
            onValueChange={(value) =>
              setPayablesEditCategoryId(value === "none" ? null : (value as number))
            }
            items={[
              { label: "No category", value: "none" as number | "none" },
              ...payablesEditCategories.map((category) => ({
                label: category.name,
                value: category.id as number | "none",
              })),
            ]}
            placeholder={
              loadingPayablesEditCategories ? "Loading categories..." : "Select category"
            }
            accessibilityLabel="Edit payable category"
          />
          {loadingPayablesEditCategories ? (
            <ThemedText style={{ color: colors.mutedText, fontSize: 12 }}>
              Loading categories...
            </ThemedText>
          ) : null}

          <FormLabel optional>Preferred payment account</FormLabel>
          <AccountSelect
            accounts={payablesEditAccounts}
            selectedValue={payablesEditPreferredAccountId ?? "none"}
            onValueChange={(value) =>
              setPayablesEditPreferredAccountId(value === "none" ? null : (value as number))
            }
            leadingItems={[{ label: "No account", value: "none" as number | "none" }]}
            labelFn={(a) => `${a.name} (${a.type === "SOURCE" ? "Wallet" : "Savings"})`}
            placeholder={loadingPayablesEditAccounts ? "Loading accounts..." : "Select account"}
            accessibilityLabel="Edit payable preferred account"
          />
          {loadingPayablesEditAccounts ? (
            <ThemedText style={{ color: colors.mutedText, fontSize: 12 }}>
              Loading accounts...
            </ThemedText>
          ) : null}

          <ModalFormActions onCancel={attemptClosePayablesEdit} onSubmit={savePayablesEdit} />
        </ModalContentCard>
      </ModalCard>
    </>
  );
}

const styles = StyleSheet.create({
  monthPresetRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  monthPresetPill: {
    flex: 1,
    justifyContent: "center",
  },
  nextMonthPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  disabledPill: {
    opacity: 0.6,
  },
  duplicateMonthList: {
    maxHeight: 240,
  },
  duplicateMonthListContent: {
    gap: spacing.xs,
  },
  duplicateMonthRow: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  duplicateMonthRowTextWrap: {
    flex: 1,
    gap: 2,
  },
});
