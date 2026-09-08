import React from "react";

import { Text } from "../../../../components/Themed";
import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { php } from "../../../../utils/currency";
import { AppScreen } from "../../../../ui/components/AppScreen";
import { ManageCategoriesModal } from "../../../../features/expenses/components/ManageCategoriesModal";
import { CategoryBreakdownSection } from "../../../../features/expenses/components/CategoryBreakdownSection";
import { ExpenseFormModal } from "../../../../features/expenses/components/ExpenseFormModal";
import { MonthlyDonutCard } from "../../../../features/expenses/components/MonthlyDonutCard";
import { useExpensesScreenController } from "../hooks/useExpensesScreenController";
import { ExpensesHeader } from "../components/ExpensesHeader";
import { ExpenseListSection } from "../components/ExpenseListSection";

export function ExpensesScreen() {
  const {
    scrollRef,
    showInitialLoading,
    monthLabel,
    focusKey,
    categoryTotals,
    selectedCategoryTotal,
    donutSelectionShade,
    expenseDonutSegments,
    donutCenterValueText,
    donutCenterSubtitle,
    categoryFilterId,
    setCategoryFilterId,
    emptyExpenses,
    filteredExpenses,
    loading,
    expenseEntryActionTarget,
    openEntryActions,
    closeEntryActions,
    expenseEntrySheetActions,
    onPrevMonth,
    onNextMonth,
    showModal,
    modalMode,
    expenseDate,
    setExpenseDate,
    showDate,
    setShowDate,
    amountText,
    setAmountText,
    amountError,
    categoryId,
    setCategoryId,
    expenseAccountId,
    setExpenseAccountId,
    visibleCategories,
    eligibleAccounts,
    historicalSelectedAccount,
    note,
    setNote,
    saveDisabled,
    saving,
    attemptCloseModal,
    handleSaveExpense,
    showCategoriesModal,
    setShowCategoriesModal,
    load,
    onOpenTransactionHistory,
  } = useExpensesScreenController();

  return (
    <AppScreen
      loading={showInitialLoading}
      loadingLabel="Loading monthly expenses..."
      scrollRef={scrollRef}
      header={<ExpensesHeader />}
    >
      <MonthlyDonutCard
        monthLabel={monthLabel}
        segments={expenseDonutSegments}
        centerValueText={donutCenterValueText}
        centerSubtitle={donutCenterSubtitle}
        focusKey={focusKey}
        selectionShade={
          selectedCategoryTotal
            ? {
                segmentKey: String(selectedCategoryTotal.categoryId),
                triggerKey: donutSelectionShade ?? "",
                durationMs: 300,
              }
            : undefined
        }
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />

      <CategoryBreakdownSection
        categoryTotals={categoryTotals}
        categoryFilterId={categoryFilterId}
        onSetCategoryFilter={setCategoryFilterId}
        onOpenManageCategories={() => setShowCategoriesModal(true)}
      />

      <ExpenseListSection
        emptyExpenses={emptyExpenses}
        filteredExpenses={filteredExpenses}
        categoryFilterId={categoryFilterId}
        onResetFilter={() => setCategoryFilterId(null)}
        onOpenEntryActions={openEntryActions}
        onPressOpenTransactionHistory={onOpenTransactionHistory}
      />

      {loading ? <Text variant="muted">Refreshing...</Text> : null}

      <ExpenseFormModal
        visible={showModal}
        mode={modalMode}
        expenseDate={expenseDate}
        showDate={showDate}
        amountText={amountText}
        amountError={amountError}
        categoryId={categoryId}
        expenseAccountId={expenseAccountId}
        note={note}
        visibleCategories={visibleCategories}
        accounts={eligibleAccounts}
        historicalAccount={historicalSelectedAccount}
        saveDisabled={saveDisabled}
        saving={saving}
        actions={[]}
        onSetShowDate={setShowDate}
        onSetExpenseDate={setExpenseDate}
        onSetAmountText={setAmountText}
        onSetCategoryId={setCategoryId}
        onSetExpenseAccountId={setExpenseAccountId}
        onSetNote={setNote}
        onClose={attemptCloseModal}
        onSave={handleSaveExpense}
      />

      <ActionBottomSheet
        visible={!!expenseEntryActionTarget}
        title={
          expenseEntryActionTarget
            ? expenseEntryActionTarget.note?.trim()
              ? `${expenseEntryActionTarget.categoryName}: ${expenseEntryActionTarget.note.trim()}`
              : expenseEntryActionTarget.categoryName
            : "Expense"
        }
        subtitle={
          expenseEntryActionTarget
            ? `${php.format(expenseEntryActionTarget.amount ?? 0)} · ${expenseEntryActionTarget.date}`
            : undefined
        }
        actions={expenseEntrySheetActions}
        onClose={closeEntryActions}
      />

      <ManageCategoriesModal
        visible={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        onCategoriesChanged={load}
      />
    </AppScreen>
  );
}
