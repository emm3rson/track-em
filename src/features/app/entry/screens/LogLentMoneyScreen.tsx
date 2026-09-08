import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import { Text } from "../../../../components/Themed";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { php } from "../../../../utils/currency";
import { useTheme } from "../../../../theme/ThemeProvider";
import { EntryAccountSelect } from "../components/EntryAccountSelect";
import { EntryAmountField } from "../components/EntryAmountField";
import { EntryDateField } from "../components/EntryDateField";
import { EntryModalLayout } from "../components/EntryModalLayout";
import { EntryTextField } from "../components/EntryTextField";
import { useLogLentMoneyScreenController } from "../hooks/useLogLentMoneyScreenController";
import type { RootStackParamList } from "../../../../navigation/types";

export function LogLentMoneyScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryLogLentMoney">>();
  const scopedAccount = route.params?.scopedAccount;

  const {
    person,
    setPerson,
    personError,
    amountText,
    setAmountText,
    amountError,
    note,
    setNote,
    targetPaymentDate,
    setTargetPaymentDate,
    accountId,
    setAccountId,
    accounts,
    loadingAccounts,
    saving,
    saveDisabled,
    cancel,
    submit,
  } = useLogLentMoneyScreenController({
    lockedAccountId: scopedAccount?.accountId ?? null,
  });

  const lockAccount = scopedAccount != null;

  return (
    <EntryModalLayout title="Lent Money" subtitle={scopedAccount?.accountName}>
      <EntryTextField
        label="Person"
        value={person}
        onChangeText={setPerson}
        accessibilityLabel="Lent money person"
        placeholder="e.g. Juan Dela Cruz"
        autoCapitalize="words"
      />
      {!person.trim() ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{personError}</Text>
      ) : null}

      <EntryAmountField
        value={amountText}
        onChangeText={setAmountText}
        accessibilityLabel="Lent money amount"
        placeholder="e.g. 500"
        error={amountText.trim() ? amountError : null}
        allowExpression
      />

      {!lockAccount ? (
        <EntryAccountSelect
          label="Account"
          accounts={accounts}
          selectedValue={accountId ?? undefined}
          onValueChange={(value) => setAccountId(value)}
          labelFn={(a) => `${a.name} (${php.format(a.balance ?? 0)})`}
          accessibilityLabel="Lent money account"
          placeholder={loadingAccounts ? "Loading accounts..." : "Select an account"}
        />
      ) : null}

      <EntryTextField
        label="Note"
        optional
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Lent money note"
        placeholder="e.g. group dinner"
      />

      <EntryDateField
        label="Target repayment date"
        optional
        value={targetPaymentDate}
        onChange={setTargetPaymentDate}
        accessibilityLabel="Target repayment date"
        clearable
        clearAccessibilityLabel="Clear target repayment date"
        placeholder="Not set"
      />

      {loadingAccounts ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator color={colors.mutedText} />
          <Text style={{ color: colors.mutedText }}>Loading accounts...</Text>
        </View>
      ) : null}

      <ModalFormActions
        onCancel={cancel}
        onSubmit={() => void submit()}
        submitLabel={saving ? "Saving..." : "Save"}
        submitAccessibilityLabel="Save lent money entry"
        cancelAccessibilityLabel="Cancel lent money entry"
        submitDisabled={saveDisabled}
        cancelDisabled={saving}
        submitLoading={saving}
      />
    </EntryModalLayout>
  );
}
