import { useState } from "react";

import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import { useObligationsDataState } from "./useObligationsDataState";
import { useObligationsPayablesController } from "./useObligationsPayablesController";
import { useObligationsReceivablesController } from "./useObligationsReceivablesController";
import { useObligationsSegmentController } from "./useObligationsSegmentController";
import { useObligationsFabPaymentFlow } from "./useObligationsFabPaymentFlow";
import { useObligationsLaunchAction } from "./useObligationsLaunchAction";

export function useObligationsScreenController() {
  const {
    load,
    loading,
    scrollRef,
    rows,
    months,
    archivedMonths,
    byMonth,
    statusTotalsByMonth,
    autoArchivedSet,
    currentMonthAnchor,
    nextMonthAnchor,
    payablesInitialLoaded,
    receivablesRows: receivablesRowsData,
    receivablesArchivedCount,
    receivablesInitialLoaded,
  } = useObligationsDataState();

  const [savingPayment, setSavingPayment] = useState(false);

  const { isSwipeLocked: isPayablesSwipeLocked, ...payablesController } =
    useObligationsPayablesController({
      load,
      scrollRef,
      months,
      archivedMonths,
      byMonth,
      autoArchivedSet,
      currentMonthAnchor,
      nextMonthAnchor,
      setSavingPayment,
    });

  const { isSwipeLocked: isReceivablesSwipeLocked, ...receivablesController } =
    useObligationsReceivablesController({
      load,
      receivablesRows: receivablesRowsData,
      setSavingPayment,
    });

  const fabFlow = useObligationsFabPaymentFlow({
    months,
    byMonth,
    receivablesRows: receivablesRowsData,
    openAddPayablePayment: payablesController.openAddPayablePayment,
    addPaymentTarget: payablesController.addPaymentTarget,
    closeAddPayablePaymentRaw: payablesController.closeAddPaymentModal,
    openAddReceivablePayment: receivablesController.openAddReceivablePayment,
    showAddReceivablePaymentModal: receivablesController.showAddPaymentModal,
    closeAddReceivablePaymentRaw: receivablesController.closeAddReceivablePaymentModal,
  });

  const swipeLocked = isPayablesSwipeLocked || isReceivablesSwipeLocked;
  const segmentController = useObligationsSegmentController(swipeLocked);

  useObligationsLaunchAction({
    setSegment: segmentController.setSegment,
    payablesInitialLoaded,
    receivablesInitialLoaded,
    openFabPayablePaymentModal: fabFlow.openFabPayablePaymentModal,
    openFabReceivablePaymentModal: fabFlow.openFabReceivablePaymentModal,
    openAddPayablePayment: payablesController.openAddPayablePayment,
    openPayablePaymentEditById: payablesController.openPayablePaymentEditById,
    openReceivablesEditById: receivablesController.openReceivablesEditById,
    openReceivablePaymentEditById: receivablesController.openReceivablePaymentEditById,
  });

  useGlobalSwipeLock(swipeLocked);

  const showInitialLoading =
    (!payablesInitialLoaded && months.length === 0 && rows.length === 0) ||
    (!receivablesInitialLoaded &&
      receivablesRowsData.length === 0 &&
      receivablesArchivedCount === 0);

  return {
    segment: {
      segment: segmentController.segment,
      setSegment: segmentController.setSegment,
      panHandlers: segmentController.panHandlers,
    },
    screen: {
      load,
      loading,
      scrollRef,
      showInitialLoading,
      savingPayment,
    },
    payables: {
      rows,
      months,
      archivedMonths,
      byMonth,
      statusTotalsByMonth,
      autoArchivedSet,
      // Month flow
      addingMonth: payablesController.addingMonth,
      onAddMonth: payablesController.onAddMonth,
      showAddMonthModal: payablesController.showAddMonthModal,
      setShowAddMonthModal: payablesController.setShowAddMonthModal,
      onAddCurrentMonth: payablesController.onAddCurrentMonth,
      onAddNextMonth: payablesController.onAddNextMonth,
      onAddCustomMonth: payablesController.onAddCustomMonth,
      customMonthInput: payablesController.customMonthInput,
      setCustomMonthInput: payablesController.setCustomMonthInput,
      isRestoringNextMonth: payablesController.isRestoringNextMonth,
      openMonthActionsSheet: payablesController.openMonthActionsSheet,
      monthActionsTarget: payablesController.monthActionsTarget,
      setMonthActionsTarget: payablesController.setMonthActionsTarget,
      monthActionsSheetActions: payablesController.monthActionsSheetActions,
      showArchives: payablesController.showArchives,
      setShowArchives: payablesController.setShowArchives,
      restoringMonth: payablesController.restoringMonth,
      restoreMonthAction: payablesController.restoreMonthAction,
      handleDeleteArchivedMonth: payablesController.handleDeleteArchivedMonth,
      archivingMonth: payablesController.archivingMonth,
      confirmArchiveMonth: payablesController.confirmArchiveMonth,
      // Entry flow
      openPayablesEntryActions: payablesController.openPayablesEntryActions,
      payableEntryActions: payablesController.payableEntryActions,
      payablesEntryActionTarget: payablesController.payablesEntryActionTarget,
      setPayablesEntryActionTarget: payablesController.setPayablesEntryActionTarget,
      showDuplicateEntryModal: payablesController.showDuplicateEntryModal,
      duplicateEntryTarget: payablesController.duplicateEntryTarget,
      duplicateTargetMonths: payablesController.duplicateTargetMonths,
      toggleDuplicateTargetMonth: payablesController.toggleDuplicateTargetMonth,
      duplicateTargetMonthOptions: payablesController.duplicateTargetMonthOptions,
      closeDuplicateEntryModal: payablesController.closeDuplicateEntryModal,
      submitDuplicateEntry: payablesController.submitDuplicateEntry,
      isSubmittingDuplicateEntry: payablesController.isSubmittingDuplicateEntry,
      payablesEditing: payablesController.payablesEditing,
      payablesEditAmount: payablesController.payablesEditAmount,
      setPayablesEditAmount: payablesController.setPayablesEditAmount,
      payablesEditDueDate: payablesController.payablesEditDueDate,
      setPayablesEditDueDate: payablesController.setPayablesEditDueDate,
      payablesEditCategoryId: payablesController.payablesEditCategoryId,
      setPayablesEditCategoryId: payablesController.setPayablesEditCategoryId,
      payablesEditPreferredAccountId: payablesController.payablesEditPreferredAccountId,
      setPayablesEditPreferredAccountId: payablesController.setPayablesEditPreferredAccountId,
      payablesEditPlatform: payablesController.payablesEditPlatform,
      setPayablesEditPlatform: payablesController.setPayablesEditPlatform,
      payablesEditCategories: payablesController.payablesEditCategories,
      payablesEditAccounts: payablesController.payablesEditAccounts,
      loadingPayablesEditCategories: payablesController.loadingPayablesEditCategories,
      loadingPayablesEditAccounts: payablesController.loadingPayablesEditAccounts,
      payablesEditMinDueDate: payablesController.payablesEditMinDueDate,
      payablesEditMaxDueDate: payablesController.payablesEditMaxDueDate,
      attemptClosePayablesEdit: payablesController.attemptClosePayablesEdit,
      savePayablesEdit: payablesController.savePayablesEdit,
      // Payment flow
      openAddPayablePayment: payablesController.openAddPayablePayment,
      addPaymentTarget: payablesController.addPaymentTarget,
      selectedAmountPlaceholder: payablesController.selectedAmountPlaceholder,
      selectedRemainingAmount: payablesController.selectedRemainingAmount,
      selectedPreferredAccountId: payablesController.selectedPreferredAccountId,
      paymentAccounts: payablesController.paymentAccounts,
      paymentCategories: payablesController.paymentCategories,
      loadingPaymentCategories: payablesController.loadingPaymentCategories,
      paymentCategoryId: payablesController.paymentCategoryId,
      setPaymentCategoryId: payablesController.setPaymentCategoryId,
      loadingPaymentAccounts: payablesController.loadingPaymentAccounts,
      paymentDate: payablesController.paymentDate,
      setPaymentDate: payablesController.setPaymentDate,
      minPaymentDate: payablesController.minPaymentDate,
      maxPaymentDate: payablesController.maxPaymentDate,
      closeAddPaymentModal: fabFlow.closeAddPayablePaymentModal,
      handleRecordPayablePayment: payablesController.handleRecordPayablePayment,
      showPaymentHistoryModal: payablesController.showPaymentHistoryModal,
      paymentHistoryEntry: payablesController.paymentHistoryEntry,
      paymentHistory: payablesController.paymentHistory,
      loadingPayments: payablesController.loadingPayments,
      openPaymentHistoryModal: payablesController.openPaymentHistoryModal,
      closePaymentHistoryModal: payablesController.closePaymentHistoryModal,
      editingPayment: payablesController.editingPayment,
      setEditingPayment: payablesController.setEditingPayment,
      closeEditPaymentModal: payablesController.closeEditPaymentModal,
      handleUpdatePayment: payablesController.handleUpdatePayment,
      confirmDeletePayment: payablesController.confirmDeletePayment,
      // FAB payable flow
      openFabPayablePaymentModal: fabFlow.openFabPayablePaymentModal,
      canAddPayablePayment: fabFlow.canAddPayablePayment,
      isFabPayablePaymentFlow: fabFlow.isFabPayablePaymentFlow,
      fabPayableMonth: fabFlow.fabPayableMonth,
      handleFabPayableMonthChange: fabFlow.handleFabPayableMonthChange,
      fabPayableMonthOptions: fabFlow.fabPayableMonthOptions,
      fabPayablePlatform: fabFlow.fabPayablePlatform,
      handleFabPayablePlatformChange: fabFlow.handleFabPayablePlatformChange,
      fabPayableEntryOptions: fabFlow.fabPayableEntryOptions,
      fabPayableAmountPlaceholder: fabFlow.fabPayableAmountPlaceholder,
    },
    receivables: {
      receivablesRows: receivablesRowsData,
      receivablesArchivedCount,
      todayStart: receivablesController.todayStart,
      receivablesShowModal: receivablesController.receivablesShowModal,
      receivablesModalMode: receivablesController.receivablesModalMode,
      receivablesModalInitialValues: receivablesController.receivablesModalInitialValues,
      receivablesSaving: receivablesController.receivablesSaving,
      closeReceivablesModal: receivablesController.closeReceivablesModal,
      handleReceivableModalSave: receivablesController.handleReceivableModalSave,
      receivablesEntryActionTarget: receivablesController.receivablesEntryActionTarget,
      openReceivablesEntryActions: receivablesController.openReceivablesEntryActions,
      closeReceivablesEntryActions: receivablesController.closeReceivablesEntryActions,
      receivableEntryActions: receivablesController.receivableEntryActions,
      openReceivablesEditById: receivablesController.openReceivablesEditById,
      showAddPaymentModal: receivablesController.showAddPaymentModal,
      paymentEntry: receivablesController.paymentEntry,
      receivablesPaymentAccounts: receivablesController.receivablesPaymentAccounts,
      loadingReceivablesPaymentAccounts: receivablesController.loadingReceivablesPaymentAccounts,
      closeAddReceivablePaymentModal: fabFlow.closeAddReceivablePaymentModal,
      handleRecordReceivablePayment: receivablesController.handleRecordReceivablePayment,
      showPaymentHistoryModal: receivablesController.showPaymentHistoryModal,
      paymentHistory: receivablesController.paymentHistory,
      loadingPayments: receivablesController.loadingPayments,
      openPaymentHistoryModal: receivablesController.openPaymentHistoryModal,
      closePaymentHistoryModal: receivablesController.closePaymentHistoryModal,
      editingPayment: receivablesController.editingPayment,
      setEditingPayment: receivablesController.setEditingPayment,
      closeEditPaymentModal: receivablesController.closeEditPaymentModal,
      handleUpdatePayment: receivablesController.handleUpdatePayment,
      confirmDeletePayment: receivablesController.confirmDeletePayment,
      showArchivedReceivables: receivablesController.showArchivedReceivables,
      openArchivedReceivablesModal: receivablesController.openArchivedReceivablesModal,
      closeArchivedReceivablesModal: receivablesController.closeArchivedReceivablesModal,
      archivedPageRows: receivablesController.archivedPageRows,
      loadingArchivedInitial: receivablesController.loadingArchivedInitial,
      handleRestoreArchivedReceivable: receivablesController.handleRestoreArchivedReceivable,
      handleDeleteArchivedReceivable: receivablesController.handleDeleteArchivedReceivable,
      // FAB receivable flow
      openFabReceivablePaymentModal: fabFlow.openFabReceivablePaymentModal,
      canAddReceivablePayment: fabFlow.canAddReceivablePayment,
      isFabReceivablePaymentFlow: fabFlow.isFabReceivablePaymentFlow,
      fabReceivableId: fabFlow.fabReceivableId,
      handleFabReceivableChange: fabFlow.handleFabReceivableChange,
      resolveFabReceivableById: fabFlow.resolveFabReceivableById,
      fabReceivableOptions: fabFlow.fabReceivableOptions,
    },
  };
}
