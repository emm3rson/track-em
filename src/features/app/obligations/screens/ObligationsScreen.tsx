import React from "react";
import { StyleSheet } from "react-native";

import { AppScreen } from "../../../../ui/components/AppScreen";
import { ScreenHeader } from "../../../../components/ScreenHeader";
import { spacing } from "../../../../styles/tokens";
import { useObligationsScreenController } from "../hooks/useObligationsScreenController";
import { ObligationsSegmentControl } from "../components/ObligationsSegmentControl";
import { ObligationsPayablesPane } from "../components/ObligationsPayablesPane";
import { ObligationsReceivablesPane } from "../components/ObligationsReceivablesPane";
import { ObligationsPayablesModals } from "../components/ObligationsPayablesModals";
import { ObligationsReceivablesModals } from "../components/ObligationsReceivablesModals";

export function ObligationsScreen() {
  const { segment, screen, payables, receivables } = useObligationsScreenController();

  const header = <ScreenHeader title="Obligations" subtitle="Track your bills and who owes you" />;

  return (
    <AppScreen
      loading={screen.showInitialLoading}
      loadingLabel="Loading obligations..."
      scrollRef={screen.scrollRef}
      panHandlers={segment.panHandlers}
      header={header}
      contentContainerStyle={styles.screenContent}
    >
      <ObligationsSegmentControl segment={segment.segment} setSegment={segment.setSegment} />

      {segment.segment === "payables" ? (
        <ObligationsPayablesPane
          rows={payables.rows}
          months={payables.months}
          archivedMonths={payables.archivedMonths}
          byMonth={payables.byMonth}
          statusTotalsByMonth={payables.statusTotalsByMonth}
          addingMonth={payables.addingMonth}
          onAddMonth={payables.onAddMonth}
          openMonthActionsSheet={payables.openMonthActionsSheet}
          openPayablesEntryActions={payables.openPayablesEntryActions}
          setShowArchives={payables.setShowArchives}
        />
      ) : (
        <ObligationsReceivablesPane
          receivablesRows={receivables.receivablesRows}
          receivablesArchivedCount={receivables.receivablesArchivedCount}
          todayStart={receivables.todayStart}
          openReceivablesEntryActions={receivables.openReceivablesEntryActions}
          openPaymentHistoryModal={receivables.openPaymentHistoryModal}
          openArchivedReceivablesModal={receivables.openArchivedReceivablesModal}
        />
      )}

      <ObligationsPayablesModals
        showAddMonthModal={payables.showAddMonthModal}
        setShowAddMonthModal={payables.setShowAddMonthModal}
        onAddCurrentMonth={payables.onAddCurrentMonth}
        onAddNextMonth={payables.onAddNextMonth}
        onAddCustomMonth={payables.onAddCustomMonth}
        customMonthInput={payables.customMonthInput}
        setCustomMonthInput={payables.setCustomMonthInput}
        addingMonth={payables.addingMonth}
        isRestoringNextMonth={payables.isRestoringNextMonth}
        monthActionsTarget={payables.monthActionsTarget}
        setMonthActionsTarget={payables.setMonthActionsTarget}
        monthActionsSheetActions={payables.monthActionsSheetActions}
        payablesEntryActionTarget={payables.payablesEntryActionTarget}
        setPayablesEntryActionTarget={payables.setPayablesEntryActionTarget}
        payableEntryActions={payables.payableEntryActions}
        showDuplicateEntryModal={payables.showDuplicateEntryModal}
        duplicateEntryTarget={payables.duplicateEntryTarget}
        duplicateTargetMonths={payables.duplicateTargetMonths}
        duplicateTargetMonthOptions={payables.duplicateTargetMonthOptions}
        toggleDuplicateTargetMonth={payables.toggleDuplicateTargetMonth}
        closeDuplicateEntryModal={payables.closeDuplicateEntryModal}
        submitDuplicateEntry={payables.submitDuplicateEntry}
        isSubmittingDuplicateEntry={payables.isSubmittingDuplicateEntry}
        addPaymentTarget={payables.addPaymentTarget}
        isFabPayablePaymentFlow={payables.isFabPayablePaymentFlow}
        fabPayableMonthOptions={payables.fabPayableMonthOptions}
        fabPayableEntryOptions={payables.fabPayableEntryOptions}
        fabPayableMonth={payables.fabPayableMonth}
        fabPayablePlatform={payables.fabPayablePlatform}
        handleFabPayableMonthChange={payables.handleFabPayableMonthChange}
        handleFabPayablePlatformChange={payables.handleFabPayablePlatformChange}
        fabPayableAmountPlaceholder={payables.fabPayableAmountPlaceholder}
        selectedAmountPlaceholder={payables.selectedAmountPlaceholder}
        selectedRemainingAmount={payables.selectedRemainingAmount}
        selectedPreferredAccountId={payables.selectedPreferredAccountId}
        paymentAccounts={payables.paymentAccounts}
        paymentCategories={payables.paymentCategories}
        loadingPaymentCategories={payables.loadingPaymentCategories}
        paymentCategoryId={payables.paymentCategoryId}
        setPaymentCategoryId={payables.setPaymentCategoryId}
        loadingPaymentAccounts={payables.loadingPaymentAccounts}
        paymentDate={payables.paymentDate}
        setPaymentDate={payables.setPaymentDate}
        minPaymentDate={payables.minPaymentDate}
        maxPaymentDate={payables.maxPaymentDate}
        savingPayment={screen.savingPayment}
        closeAddPaymentModal={payables.closeAddPaymentModal}
        handleRecordPayablePayment={payables.handleRecordPayablePayment}
        showArchives={payables.showArchives}
        setShowArchives={payables.setShowArchives}
        archivedMonths={payables.archivedMonths}
        statusTotalsByMonth={payables.statusTotalsByMonth}
        autoArchivedSet={payables.autoArchivedSet}
        restoringMonth={payables.restoringMonth}
        restoreMonthAction={payables.restoreMonthAction}
        handleDeleteArchivedMonth={payables.handleDeleteArchivedMonth}
        showPaymentHistoryModal={payables.showPaymentHistoryModal}
        paymentHistoryEntry={payables.paymentHistoryEntry}
        paymentHistory={payables.paymentHistory}
        loadingPayments={payables.loadingPayments}
        closePaymentHistoryModal={payables.closePaymentHistoryModal}
        editingPayment={payables.editingPayment}
        setEditingPayment={payables.setEditingPayment}
        closeEditPaymentModal={payables.closeEditPaymentModal}
        handleUpdatePayment={payables.handleUpdatePayment}
        confirmDeletePayment={payables.confirmDeletePayment}
        payablesEditing={payables.payablesEditing}
        payablesEditAmount={payables.payablesEditAmount}
        setPayablesEditAmount={payables.setPayablesEditAmount}
        payablesEditDueDate={payables.payablesEditDueDate}
        setPayablesEditDueDate={payables.setPayablesEditDueDate}
        payablesEditCategoryId={payables.payablesEditCategoryId}
        setPayablesEditCategoryId={payables.setPayablesEditCategoryId}
        payablesEditPreferredAccountId={payables.payablesEditPreferredAccountId}
        setPayablesEditPreferredAccountId={payables.setPayablesEditPreferredAccountId}
        payablesEditPlatform={payables.payablesEditPlatform}
        setPayablesEditPlatform={payables.setPayablesEditPlatform}
        payablesEditCategories={payables.payablesEditCategories}
        payablesEditAccounts={payables.payablesEditAccounts}
        loadingPayablesEditCategories={payables.loadingPayablesEditCategories}
        loadingPayablesEditAccounts={payables.loadingPayablesEditAccounts}
        payablesEditMinDueDate={payables.payablesEditMinDueDate}
        payablesEditMaxDueDate={payables.payablesEditMaxDueDate}
        attemptClosePayablesEdit={payables.attemptClosePayablesEdit}
        savePayablesEdit={payables.savePayablesEdit}
      />

      <ObligationsReceivablesModals
        receivablesShowModal={receivables.receivablesShowModal}
        receivablesModalMode={receivables.receivablesModalMode}
        receivablesModalInitialValues={receivables.receivablesModalInitialValues}
        receivablesSaving={receivables.receivablesSaving}
        closeReceivablesModal={receivables.closeReceivablesModal}
        handleReceivableModalSave={receivables.handleReceivableModalSave}
        receivablesEntryActionTarget={receivables.receivablesEntryActionTarget}
        closeReceivablesEntryActions={receivables.closeReceivablesEntryActions}
        receivableEntryActions={receivables.receivableEntryActions}
        showAddPaymentModal={receivables.showAddPaymentModal}
        paymentEntry={receivables.paymentEntry}
        isFabReceivablePaymentFlow={receivables.isFabReceivablePaymentFlow}
        fabReceivableOptions={receivables.fabReceivableOptions}
        fabReceivableId={receivables.fabReceivableId}
        handleFabReceivableChange={receivables.handleFabReceivableChange}
        resolveFabReceivableById={receivables.resolveFabReceivableById}
        receivablesPaymentAccounts={receivables.receivablesPaymentAccounts}
        loadingReceivablesPaymentAccounts={receivables.loadingReceivablesPaymentAccounts}
        savingPayment={screen.savingPayment}
        closeAddReceivablePaymentModal={receivables.closeAddReceivablePaymentModal}
        handleRecordReceivablePayment={receivables.handleRecordReceivablePayment}
        showPaymentHistoryModal={receivables.showPaymentHistoryModal}
        paymentHistory={receivables.paymentHistory}
        loadingPayments={receivables.loadingPayments}
        openPaymentHistoryModal={receivables.openPaymentHistoryModal}
        closePaymentHistoryModal={receivables.closePaymentHistoryModal}
        editingPayment={receivables.editingPayment}
        setEditingPayment={receivables.setEditingPayment}
        closeEditPaymentModal={receivables.closeEditPaymentModal}
        handleUpdatePayment={receivables.handleUpdatePayment}
        confirmDeletePayment={receivables.confirmDeletePayment}
        showArchivedReceivables={receivables.showArchivedReceivables}
        openArchivedReceivablesModal={receivables.openArchivedReceivablesModal}
        closeArchivedReceivablesModal={receivables.closeArchivedReceivablesModal}
        archivedPageRows={receivables.archivedPageRows}
        loadingArchivedInitial={receivables.loadingArchivedInitial}
        handleRestoreArchivedReceivable={receivables.handleRestoreArchivedReceivable}
        handleDeleteArchivedReceivable={receivables.handleDeleteArchivedReceivable}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
  },
});
