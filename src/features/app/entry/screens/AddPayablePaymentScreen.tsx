import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import { Text } from "../../../../components/Themed";
import type { RootStackParamList } from "../../../../navigation/types";
import { useTheme } from "../../../../theme/ThemeProvider";
import { PayableAddPaymentModal } from "../../../../features/payables/components/PayableAddPaymentModal";
import { useAddPayablePaymentScreenController } from "../hooks/useAddPayablePaymentScreenController";

export function AddPayablePaymentScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "EntryAddPayablePayment">>();
  const scopedAccount = route.params?.scopedAccount;

  const {
    loadingInitial,
    accounts,
    loadingAccounts,
    categories,
    loadingCategories,
    categoryId,
    setCategoryId,
    monthOptions,
    selectedMonth,
    selectedPlatform,
    setSelectedMonth,
    setSelectedPlatform,
    platformOptions,
    target,
    amountPlaceholder,
    remainingAmount,
    preferredAccountId,
    savingPayment,
    paymentDate,
    setPaymentDate,
    minPaymentDate,
    maxPaymentDate,
    lockedAccountId,
    close,
    handleRecordPayment,
  } = useAddPayablePaymentScreenController({ lockedAccountId: scopedAccount?.accountId ?? null });

  if (loadingInitial) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
        <ActivityIndicator color={colors.mutedText} />
        <Text style={{ color: colors.mutedText }}>Loading payable payment options...</Text>
      </View>
    );
  }

  return (
    <PayableAddPaymentModal
      visible
      target={target}
      amountPlaceholder={amountPlaceholder}
      remainingAmount={remainingAmount}
      selectableTarget
      targetMonthOptions={monthOptions}
      targetEntryOptions={platformOptions}
      selectedMonth={selectedMonth}
      selectedPlatform={selectedPlatform}
      onChangeMonth={setSelectedMonth}
      onChangePlatform={setSelectedPlatform}
      accounts={accounts}
      categories={categories}
      loadingCategories={loadingCategories}
      categoryId={categoryId}
      onChangeCategoryId={setCategoryId}
      loadingAccounts={loadingAccounts}
      initialAccountId={preferredAccountId}
      lockedAccountId={lockedAccountId}
      paymentDate={paymentDate}
      onChangePaymentDate={setPaymentDate}
      minimumPaymentDate={minPaymentDate}
      maximumPaymentDate={maxPaymentDate}
      savingPayment={savingPayment}
      onClose={close}
      onRecordPayment={handleRecordPayment}
    />
  );
}
