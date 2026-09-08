import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ScrollView } from "react-native";

import type { CreditRow } from "../../../../features/payables/types";
import { useObligationsPayablesMonthFlow } from "./useObligationsPayablesMonthFlow";
import { useObligationsPayablesPaymentFlow } from "./useObligationsPayablesPaymentFlow";
import { useObligationsPayablesEntryFlow } from "./useObligationsPayablesEntryFlow";

type UseObligationsPayablesControllerParams = {
  load: () => Promise<void>;
  scrollRef: MutableRefObject<ScrollView | null>;
  months: string[];
  archivedMonths: string[];
  byMonth: Map<string, Map<string, CreditRow>>;
  autoArchivedSet: Set<string>;
  currentMonthAnchor: string;
  nextMonthAnchor: string;
  setSavingPayment: Dispatch<SetStateAction<boolean>>;
};

export function useObligationsPayablesController({
  load,
  scrollRef: _scrollRef,
  months,
  archivedMonths,
  byMonth,
  autoArchivedSet,
  currentMonthAnchor,
  nextMonthAnchor,
  setSavingPayment,
}: UseObligationsPayablesControllerParams) {
  const monthFlow = useObligationsPayablesMonthFlow({
    load,
    scrollRef: _scrollRef,
    months,
    archivedMonths,
    byMonth,
    autoArchivedSet,
    currentMonthAnchor,
    nextMonthAnchor,
  });

  const paymentFlow = useObligationsPayablesPaymentFlow({
    load,
    byMonth,
    setSavingPayment,
  });

  const entryFlow = useObligationsPayablesEntryFlow({
    load,
    byMonth,
    currentMonthAnchor,
    onOpenAddPayablePayment: paymentFlow.openAddPayablePayment,
    onOpenPaymentHistory: paymentFlow.openPaymentHistoryModal,
    onPaymentTargetInvalidated: paymentFlow.onPaymentTargetInvalidated,
  });

  // Compose openPaymentHistoryModal: nulls entry action target then opens modal
  const openPaymentHistoryModal = useCallback(
    (entry: CreditRow) => {
      entryFlow.setPayablesEntryActionTarget(null);
      paymentFlow.openPaymentHistoryModal(entry);
    },
    [entryFlow, paymentFlow]
  );

  const isSwipeLocked =
    entryFlow.isSwipeLocked ||
    !!paymentFlow.addPaymentTarget ||
    paymentFlow.showPaymentHistoryModal ||
    monthFlow.showArchives ||
    !!monthFlow.monthActionsTarget ||
    monthFlow.showAddMonthModal ||
    !!paymentFlow.editingPayment;

  return {
    isSwipeLocked,
    // Month flow
    addingMonth: monthFlow.addingMonth,
    onAddMonth: monthFlow.onAddMonth,
    showAddMonthModal: monthFlow.showAddMonthModal,
    setShowAddMonthModal: monthFlow.setShowAddMonthModal,
    onAddCurrentMonth: monthFlow.onAddCurrentMonth,
    onAddNextMonth: monthFlow.onAddNextMonth,
    onAddCustomMonth: monthFlow.onAddCustomMonth,
    customMonthInput: monthFlow.customMonthInput,
    setCustomMonthInput: monthFlow.setCustomMonthInput,
    isRestoringNextMonth: monthFlow.isRestoringNextMonth,
    openMonthActionsSheet: monthFlow.openMonthActionsSheet,
    monthActionsTarget: monthFlow.monthActionsTarget,
    setMonthActionsTarget: monthFlow.setMonthActionsTarget,
    monthActionsSheetActions: monthFlow.monthActionsSheetActions,
    showArchives: monthFlow.showArchives,
    setShowArchives: monthFlow.setShowArchives,
    restoringMonth: monthFlow.restoringMonth,
    restoreMonthAction: monthFlow.restoreMonthAction,
    handleDeleteArchivedMonth: monthFlow.handleDeleteArchivedMonth,
    archivingMonth: monthFlow.archivingMonth,
    confirmArchiveMonth: monthFlow.confirmArchiveMonth,
    // Entry flow
    payablesEntryActionTarget: entryFlow.payablesEntryActionTarget,
    setPayablesEntryActionTarget: entryFlow.setPayablesEntryActionTarget,
    openPayablesEntryActions: entryFlow.openPayablesEntryActions,
    payableEntryActions: entryFlow.payableEntryActions,
    showDuplicateEntryModal: entryFlow.showDuplicateEntryModal,
    duplicateEntryTarget: entryFlow.duplicateEntryTarget,
    duplicateTargetMonths: entryFlow.duplicateTargetMonths,
    toggleDuplicateTargetMonth: entryFlow.toggleDuplicateTargetMonth,
    duplicateTargetMonthOptions: entryFlow.duplicateTargetMonthOptions,
    closeDuplicateEntryModal: entryFlow.closeDuplicateEntryModal,
    submitDuplicateEntry: entryFlow.submitDuplicateEntry,
    isSubmittingDuplicateEntry: entryFlow.isSubmittingDuplicateEntry,
    payablesEditing: entryFlow.payablesEditing,
    payablesEditAmount: entryFlow.payablesEditAmount,
    setPayablesEditAmount: entryFlow.setPayablesEditAmount,
    payablesEditDueDate: entryFlow.payablesEditDueDate,
    setPayablesEditDueDate: entryFlow.setPayablesEditDueDate,
    payablesEditCategoryId: entryFlow.payablesEditCategoryId,
    setPayablesEditCategoryId: entryFlow.setPayablesEditCategoryId,
    payablesEditPreferredAccountId: entryFlow.payablesEditPreferredAccountId,
    setPayablesEditPreferredAccountId: entryFlow.setPayablesEditPreferredAccountId,
    payablesEditPlatform: entryFlow.payablesEditPlatform,
    setPayablesEditPlatform: entryFlow.setPayablesEditPlatform,
    payablesEditCategories: entryFlow.payablesEditCategories,
    payablesEditAccounts: entryFlow.payablesEditAccounts,
    loadingPayablesEditCategories: entryFlow.loadingPayablesEditCategories,
    loadingPayablesEditAccounts: entryFlow.loadingPayablesEditAccounts,
    payablesEditMinDueDate: entryFlow.payablesEditMinDueDate,
    payablesEditMaxDueDate: entryFlow.payablesEditMaxDueDate,
    attemptClosePayablesEdit: entryFlow.attemptClosePayablesEdit,
    savePayablesEdit: entryFlow.savePayablesEdit,
    // Payment flow
    openAddPayablePayment: paymentFlow.openAddPayablePayment,
    addPaymentTarget: paymentFlow.addPaymentTarget,
    selectedAmountPlaceholder: paymentFlow.selectedAmountPlaceholder,
    selectedRemainingAmount: paymentFlow.selectedRemainingAmount,
    selectedPreferredAccountId: paymentFlow.selectedPreferredAccountId,
    paymentAccounts: paymentFlow.paymentAccounts,
    paymentCategories: paymentFlow.paymentCategories,
    loadingPaymentCategories: paymentFlow.loadingPaymentCategories,
    paymentCategoryId: paymentFlow.paymentCategoryId,
    setPaymentCategoryId: paymentFlow.setPaymentCategoryId,
    loadingPaymentAccounts: paymentFlow.loadingPaymentAccounts,
    paymentDate: paymentFlow.paymentDate,
    setPaymentDate: paymentFlow.setPaymentDate,
    minPaymentDate: paymentFlow.minPaymentDate,
    maxPaymentDate: paymentFlow.maxPaymentDate,
    closeAddPaymentModal: paymentFlow.closeAddPaymentModal,
    handleRecordPayablePayment: paymentFlow.handleRecordPayablePayment,
    showPaymentHistoryModal: paymentFlow.showPaymentHistoryModal,
    paymentHistoryEntry: paymentFlow.paymentHistoryEntry,
    paymentHistory: paymentFlow.paymentHistory,
    loadingPayments: paymentFlow.loadingPayments,
    openPaymentHistoryModal,
    closePaymentHistoryModal: paymentFlow.closePaymentHistoryModal,
    openPayablePaymentEditById: paymentFlow.openPayablePaymentEditById,
    editingPayment: paymentFlow.editingPayment,
    setEditingPayment: paymentFlow.setEditingPayment,
    closeEditPaymentModal: paymentFlow.closeEditPaymentModal,
    handleUpdatePayment: paymentFlow.handleUpdatePayment,
    confirmDeletePayment: paymentFlow.confirmDeletePayment,
  };
}
