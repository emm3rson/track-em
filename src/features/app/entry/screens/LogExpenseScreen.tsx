import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Calculator } from "lucide-react-native";

import { Text } from "../../../../components/Themed";
import { FormLabel } from "../../../../components/ui/FormLabel";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { ThemedSelect } from "../../../../components/ui/ThemedSelect";
import { php } from "../../../../utils/currency";
import { EntryAccountSelect } from "../components/EntryAccountSelect";
import { EntryAmountField } from "../components/EntryAmountField";
import { EntryDateField } from "../components/EntryDateField";
import { EntryModalLayout } from "../components/EntryModalLayout";
import { MiniAmountCalculatorModal } from "../components/MiniAmountCalculatorModal";
import { EntryTextField } from "../components/EntryTextField";
import { useLogExpenseScreenController } from "../hooks/useLogExpenseScreenController";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing } from "../../../../styles/tokens";
import type { RootStackParamList } from "../../../../navigation/types";

export function LogExpenseScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryLogExpense">>();
  const scopedAccount = route.params?.scopedAccount;
  const lockAccount = scopedAccount != null;
  const {
    loadingMeta,
    categories,
    accounts,
    amountText,
    setAmountText,
    showCalculator,
    calculatorExpression,
    setCalculatorExpression,
    openCalculator,
    closeCalculator,
    applyCalculatorResult,
    amountError,
    categoryId,
    setCategoryId,
    date,
    setDate,
    accountId,
    setAccountId,
    note,
    setNote,
    saveDisabled,
    saving,
    cancel,
    submit,
  } = useLogExpenseScreenController({ lockedAccountId: scopedAccount?.accountId ?? null });

  return (
    <EntryModalLayout title="Log Expense" subtitle={scopedAccount?.accountName}>
      <EntryAmountField
        value={amountText}
        onChangeText={setAmountText}
        accessibilityLabel="Expense amount"
        placeholder="e.g. 250"
        error={amountError}
        rightActionIcon={<Calculator size={18} color={colors.icon} />}
        onPressRightAction={openCalculator}
        rightActionAccessibilityLabel="Open mini calculator"
      />
      <Text style={{ color: colors.mutedText, fontSize: 12 }}>Need math? Tap calculator.</Text>

      <View style={styles.group}>
        <FormLabel>Category</FormLabel>
        <ThemedSelect
          selectedValue={categoryId ?? undefined}
          onValueChange={setCategoryId}
          items={categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          placeholder={loadingMeta ? "Loading categories..." : "Select category"}
          accessibilityLabel="Expense category"
        />
        {!loadingMeta && categories.length === 0 ? (
          <Text style={{ color: colors.danger, fontSize: 12 }}>
            No categories available. Create one in legacy expenses first.
          </Text>
        ) : null}
      </View>

      <EntryDateField
        label="Date"
        value={date}
        onChange={(next) => {
          if (next) setDate(next);
        }}
        accessibilityLabel="Expense date"
      />

      {!lockAccount ? (
        <EntryAccountSelect
          label="Account"
          optional
          accounts={accounts}
          selectedValue={accountId ?? "none"}
          onValueChange={(value) => setAccountId(value === "none" ? null : value)}
          leadingItems={[{ label: "No account", value: "none" as number | "none" }]}
          labelFn={(a) => `${a.name} (${php.format(a.balance ?? 0)})`}
          accessibilityLabel="Expense account"
        />
      ) : null}

      <EntryTextField
        label="Note"
        optional
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Expense note"
        placeholder="e.g. groceries and toiletries"
      />

      {loadingMeta ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.mutedText} />
          <Text style={{ color: colors.mutedText }}>Loading form metadata...</Text>
        </View>
      ) : null}

      <ModalFormActions
        onCancel={cancel}
        onSubmit={() => void submit()}
        onSecondarySubmit={() => void submit(true)}
        submitLabel={saving ? "Saving..." : "Save"}
        secondarySubmitLabel={saving ? "Saving..." : "Save & New"}
        submitAccessibilityLabel="Save expense"
        secondarySubmitAccessibilityLabel="Save expense and log another"
        cancelAccessibilityLabel="Cancel expense entry"
        submitDisabled={saveDisabled}
        cancelDisabled={saving}
        submitLoading={saving}
      />

      <MiniAmountCalculatorModal
        visible={showCalculator}
        expression={calculatorExpression}
        onChangeExpression={setCalculatorExpression}
        onClose={closeCalculator}
        onApply={applyCalculatorResult}
      />
    </EntryModalLayout>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
