import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import { Text } from "../../../../components/Themed";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { php } from "../../../../utils/currency";
import { useTheme } from "../../../../theme/ThemeProvider";
import { spacing } from "../../../../styles/tokens";
import { EntryAccountSelect } from "../components/EntryAccountSelect";
import { EntryAmountField } from "../components/EntryAmountField";
import { EntryDateField } from "../components/EntryDateField";
import { EntryModalLayout } from "../components/EntryModalLayout";
import { EntryTextField } from "../components/EntryTextField";
import { useLogIncomeScreenController } from "../hooks/useLogIncomeScreenController";
import type { RootStackParamList } from "../../../../navigation/types";

export function LogIncomeScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryLogIncome">>();
  const scopedAccount = route.params?.scopedAccount;
  const lockAccount = scopedAccount != null;
  const {
    accounts,
    loadingAccounts,
    accountId,
    setAccountId,
    date,
    setDate,
    amountText,
    setAmountText,
    amountError,
    note,
    setNote,
    saving,
    saveDisabled,
    cancel,
    submit,
  } = useLogIncomeScreenController({ lockedAccountId: scopedAccount?.accountId ?? null });

  return (
    <EntryModalLayout title="Log Income" subtitle={scopedAccount?.accountName}>
      {!lockAccount ? (
        <EntryAccountSelect
          label="Account"
          accounts={accounts}
          selectedValue={accountId ?? undefined}
          onValueChange={setAccountId}
          labelFn={(a) => `${a.name} (${php.format(a.balance ?? 0)})`}
          placeholder={loadingAccounts ? "Loading accounts..." : "Select account"}
          accessibilityLabel="Income account"
        />
      ) : null}
      {!loadingAccounts && accounts.length === 0 ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          No eligible SOURCE account available for income logging.
        </Text>
      ) : null}

      <EntryDateField
        label="Date"
        value={date}
        onChange={(next) => {
          if (next) setDate(next);
        }}
        accessibilityLabel="Income date"
      />

      <EntryAmountField
        value={amountText}
        onChangeText={setAmountText}
        accessibilityLabel="Income amount"
        placeholder="e.g. 15000"
        error={amountError}
      />

      <EntryTextField
        label="Note"
        optional
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Income note"
        placeholder="e.g. Salary or reimbursement"
      />

      {loadingAccounts ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.mutedText} />
          <Text style={{ color: colors.mutedText }}>Loading eligible accounts...</Text>
        </View>
      ) : null}

      <ModalFormActions
        onCancel={cancel}
        onSubmit={() => void submit()}
        submitLabel={saving ? "Saving..." : "Save Income"}
        submitAccessibilityLabel="Save income"
        cancelAccessibilityLabel="Cancel income entry"
        submitDisabled={saveDisabled}
        cancelDisabled={saving}
        submitLoading={saving}
      />
    </EntryModalLayout>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
