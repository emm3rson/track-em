import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import { Text } from "../../../../components/Themed";
import type { RootStackParamList } from "../../../../navigation/types";
import { useTheme } from "../../../../theme/ThemeProvider";
import { AddPaymentModal } from "../../../../features/receivables/components/AddPaymentModal";
import { useAddReceivablePaymentScreenController } from "../hooks/useAddReceivablePaymentScreenController";

export function AddReceivablePaymentScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryAddReceivablePayment">>();
  const scopedAccount = route.params?.scopedAccount;

  const {
    loadingInitial,
    selectedEntry,
    selectedEntryId,
    setSelectedEntryId,
    entryOptions,
    resolveEntryById,
    accounts,
    loadingAccounts,
    savingPayment,
    lockedAccountId,
    preferredAccountId,
    close,
    handleRecordPayment,
  } = useAddReceivablePaymentScreenController(scopedAccount?.accountId ?? null);

  if (loadingInitial) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
        <ActivityIndicator color={colors.mutedText} />
        <Text style={{ color: colors.mutedText }}>Loading receivable payment options...</Text>
      </View>
    );
  }

  return (
    <AddPaymentModal
      visible
      entry={selectedEntry}
      selectableEntry
      entryOptions={entryOptions}
      selectedEntryId={selectedEntryId}
      onChangeEntryId={setSelectedEntryId}
      resolveEntryById={resolveEntryById}
      accounts={accounts}
      loadingAccounts={loadingAccounts}
      lockedAccountId={lockedAccountId}
      initialAccountId={preferredAccountId}
      savingPayment={savingPayment}
      onClose={close}
      onRecordPayment={handleRecordPayment}
    />
  );
}
