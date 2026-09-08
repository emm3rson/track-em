import React, { useEffect, useRef, useState } from "react";
import { Alert, TextInput } from "react-native";
import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { FormLabel } from "../../../components/ui/FormLabel";
import { InnerCard } from "../../../components/ui/InnerCard";
import { ModalFormActions } from "../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import { AccountSelect } from "../../../components/ui/AccountSelect";
import { ThemedSelect } from "../../../components/ui/ThemedSelect";
import { components, spacing, typography } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { parseNumber } from "../../../utils/parseNumber";
import { php } from "../../../utils/currency";
import { confirmDiscardChanges } from "../../../utils/confirm";
import type { ReceivablePaymentAccountRow, ReceivableRow } from "../types";

export type AddPaymentModalProps = {
  visible: boolean;
  entry: ReceivableRow | null;
  selectableEntry?: boolean;
  entryOptions?: { label: string; value: number | "none" }[];
  selectedEntryId?: number | "none";
  onChangeEntryId?: (id: number | "none") => void;
  resolveEntryById?: (id: number) => ReceivableRow | null;
  accounts: ReceivablePaymentAccountRow[];
  loadingAccounts: boolean;
  lockedAccountId?: number | null;
  initialAccountId?: number | null;
  savingPayment: boolean;
  onClose: () => void;
  onRecordPayment: (
    amount: number,
    note?: string,
    accountId?: number | null
  ) => Promise<void> | void;
};

export function AddPaymentModal({
  visible,
  entry,
  selectableEntry = false,
  entryOptions = [],
  selectedEntryId = "none",
  onChangeEntryId,
  resolveEntryById,
  accounts,
  loadingAccounts,
  lockedAccountId,
  initialAccountId,
  savingPayment,
  onClose,
  onRecordPayment,
}: AddPaymentModalProps) {
  const { colors } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);
  const [paymentAmountText, setPaymentAmountText] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [accountValue, setAccountValue] = useState<number | "none">("none");
  const [amountEdited, setAmountEdited] = useState(false);
  const wasVisibleRef = useRef(false);
  const lockAccount = lockedAccountId != null;

  const resolvedEntry =
    selectableEntry && typeof selectedEntryId === "number"
      ? (resolveEntryById?.(selectedEntryId) ?? null)
      : entry;
  const isEntrySelectionValid = !selectableEntry || typeof selectedEntryId === "number";

  const remaining = resolvedEntry
    ? Math.max(0, resolvedEntry.amount - (resolvedEntry.paidAmount ?? 0))
    : 0;
  const expectedAmountText = String(remaining);

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    if (!wasVisible && visible) {
      setPaymentAmountText(expectedAmountText);
      setPaymentNote("");
      setAmountEdited(false);
    }
    wasVisibleRef.current = visible;
  }, [expectedAmountText, visible]);

  useEffect(() => {
    if (!visible) return;
    setAccountValue(initialAccountId ?? "none");
  }, [initialAccountId, visible]);

  useEffect(() => {
    if (!visible || amountEdited) return;
    setPaymentAmountText(expectedAmountText);
  }, [amountEdited, expectedAmountText, visible]);

  useEffect(() => {
    if (lockAccount) return;
    if (accountValue === "none") return;
    if (accounts.some((account) => account.id === accountValue)) return;
    setAccountValue("none");
  }, [accountValue, accounts, lockAccount]);

  const handleRecordPayment = async () => {
    if (!resolvedEntry || !isEntrySelectionValid) return;
    const amt = parseNumber(paymentAmountText);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert("Enter a valid payment amount");
      return;
    }
    if (amt > remaining) {
      Alert.alert("Payment exceeds remaining balance");
      return;
    }
    const trimmedNote = paymentNote.trim();
    const selectedAccountId = lockAccount
      ? lockedAccountId
      : accountValue === "none"
        ? null
        : accountValue;
    await onRecordPayment(amt, trimmedNote ? trimmedNote : undefined, selectedAccountId);
    setPaymentAmountText("");
    setPaymentNote("");
    setAmountEdited(false);
    setAccountValue("none");
  };

  const initialAccountValue = initialAccountId ?? "none";
  const hasDraft =
    amountEdited ||
    paymentNote.trim() !== "" ||
    (!lockAccount && accountValue !== initialAccountValue);
  const isDirty = remaining > 0 && hasDraft;

  const attemptClose = () => {
    if (savingPayment) return;
    if (!isDirty) {
      onClose();
      return;
    }
    confirmDiscardChanges(onClose);
  };

  return (
    <ModalCard
      visible={visible}
      onRequestClose={attemptClose}
      innerStyle={{ width: "100%", maxHeight: components.modalScrollableMaxHeight }}
      useCard={false}
      scrollable={false}
    >
      <ModalContentCard>
        <ModalHeaderBar title="Add Payment" subtitle={resolvedEntry?.person} />

        {selectableEntry ? (
          <>
            <FormLabel>Receivable</FormLabel>
            <ThemedSelect
              selectedValue={selectedEntryId}
              onValueChange={(value) => onChangeEntryId?.(value as number | "none")}
              items={entryOptions}
              accessibilityLabel="Select receivable for payment"
            />
          </>
        ) : null}

        <InnerCard style={{ padding: spacing.md, gap: components.receivablePaymentSummaryGap }}>
          <Text style={{ color: colors.mutedText }}>Remaining balance</Text>
          <Text style={{ fontWeight: "800", color: colors.text }}>{php.format(remaining)}</Text>
        </InnerCard>

        {remaining > 0 ? (
          <>
            <FormLabel>Payment amount</FormLabel>
            <FieldShell>
              <TextInput
                accessibilityLabel="Payment amount"
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
                  accessibilityLabel="Select linked account for payment"
                />
                {loadingAccounts ? (
                  <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
                    Loading accounts...
                  </Text>
                ) : null}
              </>
            ) : null}

            <FormLabel optional>Payment note</FormLabel>
            <FieldShell>
              <TextInput
                accessibilityLabel="Payment note"
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="e.g. Bank transfer"
                placeholderTextColor={colors.placeholderText}
                style={fieldInputStyle}
              />
            </FieldShell>

            <ModalFormActions
              onCancel={attemptClose}
              onSubmit={() => {
                void handleRecordPayment();
              }}
              submitLabel={savingPayment ? "Saving..." : "Add Payment"}
              cancelDisabled={savingPayment}
              submitDisabled={savingPayment || !isEntrySelectionValid}
              submitLoading={savingPayment}
              submitAccessibilityLabel={savingPayment ? "Saving payment" : "Add payment"}
            />
          </>
        ) : null}
      </ModalContentCard>
    </ModalCard>
  );
}
