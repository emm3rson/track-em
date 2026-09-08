import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import { Text } from "../../../../components/Themed";
import { ModalFormActions } from "../../../../components/ui/ModalFormActions";
import { useTheme } from "../../../../theme/ThemeProvider";
import { php } from "../../../../utils/currency";
import { parseNumber } from "../../../../utils/parseNumber";
import { spacing } from "../../../../styles/tokens";
import type { RootStackParamList } from "../../../../navigation/types";
import { EntryAccountSelect } from "../components/EntryAccountSelect";
import { EntryAmountField } from "../components/EntryAmountField";
import { EntryDateField } from "../components/EntryDateField";
import { EntryModalLayout } from "../components/EntryModalLayout";
import { EntryTextField } from "../components/EntryTextField";
import { useTransferFundsScreenController } from "../hooks/useTransferFundsScreenController";

export function TransferFundsScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryTransferFunds">>();
  const scopedAccount = route.params?.scopedAccount;
  const lockedDirection = route.params?.lockedDirection;
  const lockFromAccount = lockedDirection === "from" && scopedAccount != null;
  const lockToAccount = lockedDirection === "to" && scopedAccount != null;
  const {
    accounts,
    loadingAccounts,
    hasEnoughAccounts,
    fromAccountId,
    setFromAccountId,
    toAccountId,
    setToAccountId,
    date,
    setDate,
    amountText,
    setAmountText,
    amountError,
    feeText,
    setFeeText,
    feeError,
    note,
    setNote,
    saving,
    saveDisabled,
    cancel,
    submit,
  } = useTransferFundsScreenController({
    lockedAccountId: scopedAccount?.accountId ?? null,
    lockedDirection,
  });

  const fromAccounts = React.useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const valA = a.type === "SOURCE" ? 0 : 1;
        const valB = b.type === "SOURCE" ? 0 : 1;
        return valA - valB;
      }),
    [accounts]
  );

  const toAccounts = React.useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const valA = a.type === "SAVINGS" ? 0 : 1;
        const valB = b.type === "SAVINGS" ? 0 : 1;
        return valA - valB;
      }),
    [accounts]
  );

  const parsedReceived = parseNumber(amountText);
  const parsedFee = parseNumber(feeText);
  const safeReceived = Number.isFinite(parsedReceived) ? Math.max(0, parsedReceived) : 0;
  const safeFee = Number.isFinite(parsedFee) ? Math.max(0, parsedFee) : 0;
  const sourceDeduction = safeReceived + safeFee;

  return (
    <EntryModalLayout title="Transfer Funds" subtitle={scopedAccount?.accountName}>
      {!lockFromAccount ? (
        <EntryAccountSelect
          label="From account"
          accounts={fromAccounts}
          selectedValue={fromAccountId ?? undefined}
          onValueChange={setFromAccountId}
          labelFn={(a) => `${a.name} (${php.format(a.balance ?? 0)})`}
          placeholder={loadingAccounts ? "Loading accounts..." : "Select source account"}
          accessibilityLabel="Transfer source account"
        />
      ) : null}

      {!lockToAccount ? (
        <EntryAccountSelect
          label="To account"
          accounts={toAccounts}
          selectedValue={toAccountId ?? undefined}
          onValueChange={setToAccountId}
          labelFn={(a) => `${a.name} (${php.format(a.balance ?? 0)})`}
          placeholder={loadingAccounts ? "Loading accounts..." : "Select destination account"}
          accessibilityLabel="Transfer destination account"
        />
      ) : null}

      {!loadingAccounts && !hasEnoughAccounts ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          At least two eligible accounts are required to transfer funds.
        </Text>
      ) : null}

      <EntryDateField
        label="Date"
        value={date}
        onChange={(next) => {
          if (next) setDate(next);
        }}
        accessibilityLabel="Transfer date"
      />

      <EntryAmountField
        label="Amount received"
        value={amountText}
        onChangeText={setAmountText}
        accessibilityLabel="Transfer amount"
        placeholder="e.g. 2500"
        error={amountError}
      />

      <EntryAmountField
        label="Convenience fee"
        optional
        value={feeText}
        onChangeText={setFeeText}
        accessibilityLabel="Transfer fee"
        placeholder="Optional, e.g. 15"
        error={feeError}
      />

      <View style={styles.summaryBox}>
        <Text style={{ color: colors.mutedText }}>
          Source deduction: {php.format(sourceDeduction)}
        </Text>
      </View>

      <EntryTextField
        label="Note"
        optional
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Transfer note"
        placeholder="e.g. transfer for savings, house, etc."
      />

      {loadingAccounts ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.mutedText} />
          <Text style={{ color: colors.mutedText }}>Loading transfer accounts...</Text>
        </View>
      ) : null}

      <ModalFormActions
        onCancel={cancel}
        onSubmit={() => void submit()}
        submitLabel={saving ? "Saving..." : "Save Transfer"}
        submitAccessibilityLabel="Save transfer"
        cancelAccessibilityLabel="Cancel transfer entry"
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
  summaryBox: {
    gap: spacing.xs,
  },
});
