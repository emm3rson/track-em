import React from "react";

import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { AddPaymentModal } from "../../../../features/receivables/components/AddPaymentModal";
import { ArchivedReceivablesModal } from "../../../../features/receivables/components/ArchivedReceivablesModal";
import { EditPaymentModal } from "../../../../features/receivables/components/EditPaymentModal";
import { PaymentHistoryModal } from "../../../../features/receivables/components/PaymentHistoryModal";
import { ReceivableModal } from "../../../../features/receivables/components/ReceivableModal";
import type { ReceivableModalSave } from "../../../../features/receivables/components/ReceivableModal";
import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { PaymentRow, ReceivablePaymentAccountRow, ReceivableRow } from "../types";

type Props = {
  // Receivable edit modal
  receivablesShowModal: boolean;
  receivablesModalMode: "add" | "edit";
  receivablesModalInitialValues:
    | {
        person: string;
        amount: number;
        date: string;
        note: string | null;
        targetPaymentDate: string | null;
      }
    | undefined;
  receivablesSaving: boolean;
  closeReceivablesModal: () => void;
  handleReceivableModalSave: (values: ReceivableModalSave) => void;
  // Entry actions sheet
  receivablesEntryActionTarget: ReceivableRow | null;
  closeReceivablesEntryActions: () => void;
  receivableEntryActions: ActionBottomSheetAction[];
  // Add payment modal
  showAddPaymentModal: boolean;
  paymentEntry: ReceivableRow | null;
  isFabReceivablePaymentFlow: boolean;
  fabReceivableOptions: { label: string; value: number | "none" }[];
  fabReceivableId: number | "none";
  handleFabReceivableChange: (value: number | "none") => void;
  resolveFabReceivableById: (id: number) => ReceivableRow | null;
  receivablesPaymentAccounts: ReceivablePaymentAccountRow[];
  loadingReceivablesPaymentAccounts: boolean;
  savingPayment: boolean;
  closeAddReceivablePaymentModal: () => void;
  handleRecordReceivablePayment: (
    amount: number,
    note?: string,
    accountId?: number | null,
    entryOverride?: ReceivableRow | null
  ) => void;
  // Payment history modal
  showPaymentHistoryModal: boolean;
  paymentHistory: PaymentRow[];
  loadingPayments: boolean;
  openPaymentHistoryModal: (entry: ReceivableRow) => void;
  closePaymentHistoryModal: () => void;
  editingPayment: PaymentRow | null;
  setEditingPayment: (payment: PaymentRow | null) => void;
  closeEditPaymentModal: () => void;
  handleUpdatePayment: (payment: PaymentRow, amount: number, note?: string) => void;
  confirmDeletePayment: (payment: PaymentRow) => void;
  // Archived receivables modal
  showArchivedReceivables: boolean;
  openArchivedReceivablesModal: () => void;
  closeArchivedReceivablesModal: () => void;
  archivedPageRows: ReceivableRow[];
  loadingArchivedInitial: boolean;
  handleRestoreArchivedReceivable: (entry: ReceivableRow) => void;
  handleDeleteArchivedReceivable: (entry: ReceivableRow) => void;
};

export function ObligationsReceivablesModals({
  receivablesShowModal,
  receivablesModalMode,
  receivablesModalInitialValues,
  receivablesSaving,
  closeReceivablesModal,
  handleReceivableModalSave,
  receivablesEntryActionTarget,
  closeReceivablesEntryActions,
  receivableEntryActions,
  showAddPaymentModal,
  paymentEntry,
  isFabReceivablePaymentFlow,
  fabReceivableOptions,
  fabReceivableId,
  handleFabReceivableChange,
  resolveFabReceivableById,
  receivablesPaymentAccounts,
  loadingReceivablesPaymentAccounts,
  savingPayment,
  closeAddReceivablePaymentModal,
  handleRecordReceivablePayment,
  showPaymentHistoryModal,
  paymentHistory,
  loadingPayments,
  closePaymentHistoryModal,
  editingPayment,
  setEditingPayment,
  closeEditPaymentModal,
  handleUpdatePayment,
  confirmDeletePayment,
  showArchivedReceivables,
  closeArchivedReceivablesModal,
  archivedPageRows,
  loadingArchivedInitial,
  handleRestoreArchivedReceivable,
  handleDeleteArchivedReceivable,
}: Props) {
  const selectedReceivablePreferredAccountId =
    isFabReceivablePaymentFlow && typeof fabReceivableId === "number"
      ? (resolveFabReceivableById(fabReceivableId)?.preferredAccountId ?? null)
      : (paymentEntry?.preferredAccountId ?? null);

  return (
    <>
      <ReceivableModal
        visible={receivablesShowModal}
        mode={receivablesModalMode}
        initialValues={receivablesModalInitialValues}
        saving={receivablesSaving}
        onClose={closeReceivablesModal}
        onSave={handleReceivableModalSave}
      />

      <ActionBottomSheet
        visible={!!receivablesEntryActionTarget}
        title={
          receivablesEntryActionTarget
            ? `Actions for ${receivablesEntryActionTarget.person}`
            : "Receivable Actions"
        }
        actions={receivableEntryActions}
        onClose={closeReceivablesEntryActions}
      />

      <AddPaymentModal
        visible={showAddPaymentModal}
        entry={paymentEntry}
        selectableEntry={isFabReceivablePaymentFlow}
        entryOptions={fabReceivableOptions}
        selectedEntryId={fabReceivableId}
        onChangeEntryId={handleFabReceivableChange}
        resolveEntryById={resolveFabReceivableById}
        accounts={receivablesPaymentAccounts}
        loadingAccounts={loadingReceivablesPaymentAccounts}
        initialAccountId={selectedReceivablePreferredAccountId}
        savingPayment={savingPayment}
        onClose={closeAddReceivablePaymentModal}
        onRecordPayment={(amount, note, accountId) => {
          if (isFabReceivablePaymentFlow && typeof fabReceivableId === "number") {
            const selectedEntry = resolveFabReceivableById(fabReceivableId);
            void handleRecordReceivablePayment(amount, note, accountId, selectedEntry);
            return;
          }
          void handleRecordReceivablePayment(amount, note, accountId);
        }}
      />

      <PaymentHistoryModal
        visible={showPaymentHistoryModal}
        entry={paymentEntry}
        payments={paymentHistory}
        loadingPayments={loadingPayments}
        savingPayment={savingPayment}
        onClose={closePaymentHistoryModal}
        onEditPayment={setEditingPayment}
        onDeletePayment={confirmDeletePayment}
      />

      <EditPaymentModal
        visible={!!editingPayment}
        payment={editingPayment}
        remainingTotal={
          paymentEntry
            ? paymentEntry.amount - (paymentEntry.paidAmount ?? 0) + (editingPayment?.amount ?? 0)
            : 0
        }
        saving={savingPayment}
        onClose={closeEditPaymentModal}
        onSave={handleUpdatePayment}
      />

      <ArchivedReceivablesModal
        visible={showArchivedReceivables}
        onRequestClose={closeArchivedReceivablesModal}
        rows={archivedPageRows}
        loadingInitial={loadingArchivedInitial}
        onRestoreReceivable={handleRestoreArchivedReceivable}
        onDeleteReceivable={handleDeleteArchivedReceivable}
      />
    </>
  );
}
