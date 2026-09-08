import React, { useEffect, useRef, useState } from "react";
import { Alert, TextInput } from "react-native";

import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { FormLabel } from "../../../components/ui/FormLabel";
import { ModalFormActions } from "../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import { AccountSelect } from "../../../components/ui/AccountSelect";
import { ThemedSelect } from "../../../components/ui/ThemedSelect";
import { InnerCard } from "../../../components/ui/InnerCard";
import { components, spacing, typography } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { confirmDiscardChanges } from "../../../utils/confirm";
import { php } from "../../../utils/currency";
import { formatMonthLabel } from "../../../utils/dates";
import { parseNumber } from "../../../utils/parseNumber";
import { EntryDateField } from "../../app/entry/components/EntryDateField";
import type { PayablePaymentAccountRow } from "../types";

export type PayablePaymentTarget = {
  month: string;
  platform: string;
};

export type PayableAddPaymentModalProps = {
  visible: boolean;
  target: PayablePaymentTarget | null;
  amountPlaceholder?: string;
  remainingAmount?: number;
  initialAccountId?: number | null;
  selectableTarget?: boolean;
  targetMonthOptions?: { label: string; value: string }[];
  targetEntryOptions?: { label: string; value: string }[];
  selectedMonth?: string;
  selectedPlatform?: string;
  onChangeMonth?: (month: string) => void;
  onChangePlatform?: (platform: string) => void;
  accounts: PayablePaymentAccountRow[];
  categories: { id: number; name: string }[];
  loadingCategories: boolean;
  categoryId: number | null;
  onChangeCategoryId: (value: number | null) => void;
  loadingAccounts: boolean;
  lockedAccountId?: number | null;
  paymentDate: Date;
  onChangePaymentDate: (value: Date) => void;
  minimumPaymentDate?: Date;
  maximumPaymentDate?: Date;
  savingPayment: boolean;
  onClose: () => void;
  onRecordPayment: (amount: number, accountId?: number | null) => Promise<void> | void;
};

export function PayableAddPaymentModal({
  visible,
  target,
  amountPlaceholder,
  remainingAmount = 0,
  initialAccountId,
  selectableTarget = false,
  targetMonthOptions = [],
  targetEntryOptions = [],
  selectedMonth,
  selectedPlatform,
  onChangeMonth,
  onChangePlatform,
  accounts,
  categories,
  loadingCategories,
  categoryId,
  onChangeCategoryId,
  loadingAccounts,
  lockedAccountId,
  paymentDate,
  onChangePaymentDate,
  minimumPaymentDate,
  maximumPaymentDate,
  savingPayment,
  onClose,
  onRecordPayment,
}: PayableAddPaymentModalProps) {
  const { colors } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);
  const [paymentAmountText, setPaymentAmountText] = useState("");
  const [accountValue, setAccountValue] = useState<number | "none">("none");
  const [amountEdited, setAmountEdited] = useState(false);
  const wasVisibleRef = useRef(false);
  const lockAccount = lockedAccountId != null;

  const resolvedMonth = selectableTarget ? selectedMonth : target?.month;
  const resolvedPlatform = selectableTarget ? selectedPlatform : target?.platform;
  const isTargetSelectionValid = !!resolvedMonth && !!resolvedPlatform;
  const subtitle =
    resolvedMonth && resolvedPlatform
      ? `${resolvedPlatform} - ${formatMonthLabel(resolvedMonth)}`
      : undefined;
  const canRecordPayment = remainingAmount > 0;

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    if (!wasVisible && visible) {
      setPaymentAmountText(amountPlaceholder || "0");
      setAmountEdited(false);
    }
    wasVisibleRef.current = visible;
  }, [amountPlaceholder, visible]);

  useEffect(() => {
    if (!visible) return;
    setAccountValue(initialAccountId ?? "none");
  }, [initialAccountId, visible]);

  useEffect(() => {
    if (!visible || amountEdited) return;
    setPaymentAmountText(amountPlaceholder || "0");
  }, [amountEdited, amountPlaceholder, visible]);

  useEffect(() => {
    if (lockAccount) return;
    if (accountValue === "none") return;
    if (accounts.some((account) => account.id === accountValue)) return;
    setAccountValue("none");
  }, [accountValue, accounts, lockAccount]);

  const initialAccountValue = initialAccountId ?? "none";
  const hasDraft = amountEdited || (!lockAccount && accountValue !== initialAccountValue);

  const attemptClose = () => {
    if (savingPayment) return;
    if (!hasDraft) {
      onClose();
      return;
    }
    confirmDiscardChanges(onClose);
  };

  const handleSubmit = async () => {
    if (!target || !isTargetSelectionValid) return;
    const amount = parseNumber(paymentAmountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Enter a valid payment amount");
      return;
    }
    if (amount > remainingAmount) {
      Alert.alert("Payment exceeds remaining balance");
      return;
    }

    const selectedAccountId = lockAccount
      ? lockedAccountId
      : accountValue === "none"
        ? null
        : accountValue;
    await onRecordPayment(amount, selectedAccountId);
    setPaymentAmountText("");
    setAmountEdited(false);
    setAccountValue("none");
  };

  return (
    <ModalCard visible={visible} onRequestClose={attemptClose} useCard={false}>
      <ModalContentCard>
        <ModalHeaderBar title="Add Payment" subtitle={subtitle} />

        {selectableTarget ? (
          <>
            <FormLabel>Month</FormLabel>
            <ThemedSelect
              selectedValue={selectedMonth}
              onValueChange={(value) => onChangeMonth?.(value as string)}
              items={targetMonthOptions}
              accessibilityLabel="Select payable month for payment"
            />

            <FormLabel>Payable</FormLabel>
            <ThemedSelect
              selectedValue={selectedPlatform}
              onValueChange={(value) => onChangePlatform?.(value as string)}
              items={targetEntryOptions}
              accessibilityLabel="Select payable for payment"
            />
          </>
        ) : null}

        <EntryDateField
          label="Payment date"
          value={paymentDate}
          onChange={(next) => {
            if (next) onChangePaymentDate(next);
          }}
          accessibilityLabel="Payable payment date"
          minimumDate={minimumPaymentDate}
          maximumDate={maximumPaymentDate}
        />

        <InnerCard style={{ padding: spacing.md, gap: components.receivablePaymentSummaryGap }}>
          <Text style={{ color: colors.mutedText }}>Remaining balance</Text>
          <Text style={{ fontWeight: "800", color: colors.text }}>
            {php.format(remainingAmount)}
          </Text>
        </InnerCard>

        {canRecordPayment ? (
          <>
            <FormLabel>Payment amount</FormLabel>
            <FieldShell>
              <TextInput
                accessibilityLabel="Payable payment amount"
                value={paymentAmountText}
                onChangeText={(value) => {
                  setAmountEdited(true);
                  setPaymentAmountText(value);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.placeholderText}
                style={fieldInputStyle}
              />
            </FieldShell>

            {!lockAccount ? (
              <>
                <FormLabel optional>Account</FormLabel>
                <AccountSelect
                  accounts={accounts}
                  selectedValue={accountValue}
                  onValueChange={(value) => setAccountValue(value as number | "none")}
                  leadingItems={[{ label: "No account", value: "none" as number | "none" }]}
                  labelFn={(a) => `${a.name} (${a.type === "SOURCE" ? "Wallet" : "Savings"})`}
                  accessibilityLabel="Select linked account for payable payment"
                />
              </>
            ) : null}

            <FormLabel optional>Expense Category</FormLabel>
            <ThemedSelect
              selectedValue={categoryId ?? "none"}
              onValueChange={(value) =>
                onChangeCategoryId(value === "none" ? null : ((value as number) ?? null))
              }
              items={[
                { label: "No category", value: "none" as number | "none" },
                ...categories.map((category) => ({
                  label: category.name,
                  value: category.id as number | "none",
                })),
              ]}
              placeholder={loadingCategories ? "Loading categories..." : "Select category"}
              accessibilityLabel="Select expense category for payable payment"
            />
            {loadingCategories ? (
              <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
                Loading categories...
              </Text>
            ) : null}
            {!lockAccount && loadingAccounts ? (
              <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
                Loading accounts...
              </Text>
            ) : null}
          </>
        ) : null}

        <ModalFormActions
          onCancel={attemptClose}
          onSubmit={() => {
            void handleSubmit();
          }}
          submitLabel={savingPayment ? "Saving..." : "Add Payment"}
          cancelDisabled={savingPayment}
          submitDisabled={savingPayment || !isTargetSelectionValid || !canRecordPayment}
          submitLoading={savingPayment}
        />
      </ModalContentCard>
    </ModalCard>
  );
}
