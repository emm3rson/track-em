import React, { useEffect, useRef, useState } from "react";
import { Alert, TextInput } from "react-native";
import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { FormLabel } from "../../../components/ui/FormLabel";
import { ModalFormActions } from "../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import { typography } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { parseNumber } from "../../../utils/parseNumber";
import { confirmDiscardChanges } from "../../../utils/confirm";
import { EntryDateField } from "../../app/entry/components/EntryDateField";
import type { PayablePaymentRow } from "../types";

export type EditPaymentModalProps = {
  visible: boolean;
  payment: PayablePaymentRow | null;
  remainingTotal: number;
  saving: boolean;
  onClose: () => void;
  onSave: (
    payment: PayablePaymentRow,
    amount: number,
    paymentDateIso: string
  ) => Promise<void> | void;
};

export function EditPaymentModal({
  visible,
  payment,
  remainingTotal,
  saving,
  onClose,
  onSave,
}: EditPaymentModalProps) {
  const { colors } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);
  const [amountText, setAmountText] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const initialRef = useRef<{ amountText: string; paymentDateIso: string } | null>(null);

  useEffect(() => {
    if (visible && payment) {
      const nextAmountText = String(payment.amount ?? 0);
      const nextPaymentDate = payment.paidAt ? new Date(payment.paidAt) : new Date();
      setAmountText(nextAmountText);
      setPaymentDate(nextPaymentDate);
      initialRef.current = {
        amountText: nextAmountText,
        paymentDateIso: payment.paidAt,
      };
    }
    if (!visible) {
      initialRef.current = null;
    }
  }, [visible, payment]);

  const onSubmit = async () => {
    if (!payment) return;
    const amt = parseNumber(amountText);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert("Enter a valid payment amount");
      return;
    }
    if (amt > remainingTotal) {
      Alert.alert("Payment exceeds remaining balance");
      return;
    }
    await onSave(payment, amt, paymentDate.toISOString().slice(0, 10));
  };

  const initial = initialRef.current;
  const currentPaymentDateIso = paymentDate.toISOString().slice(0, 10);
  const isDirty =
    !!initial &&
    (amountText !== initial.amountText || currentPaymentDateIso !== initial.paymentDateIso);

  const attemptClose = () => {
    if (saving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    confirmDiscardChanges(onClose);
  };

  return (
    <ModalCard visible={visible} onRequestClose={attemptClose} useCard={false}>
      <ModalContentCard>
        <ModalHeaderBar title="Edit Payment" />

        <EntryDateField
          label="Payment date"
          value={paymentDate}
          onChange={(next) => {
            if (next) setPaymentDate(next);
          }}
          accessibilityLabel="Edit payable payment date"
        />

        <FormLabel>Payment amount</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Payable payment amount"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="e.g. 500"
            placeholderTextColor={colors.placeholderText}
            style={fieldInputStyle}
          />
        </FieldShell>

        {payment?.accountName ? (
          <>
            <FormLabel>Linked account</FormLabel>
            <FieldShell>
              <Text style={{ color: colors.text }}>{payment.accountName}</Text>
            </FieldShell>
            <Text style={{ color: colors.mutedText, fontSize: typography.caption }}>
              Account link cannot be changed after payment is created.
            </Text>
          </>
        ) : null}

        <ModalFormActions
          onCancel={attemptClose}
          onSubmit={() => {
            void onSubmit();
          }}
          submitLabel={saving ? "Saving..." : "Save"}
          cancelDisabled={saving}
          submitDisabled={saving}
          submitLoading={saving}
        />
      </ModalContentCard>
    </ModalCard>
  );
}
