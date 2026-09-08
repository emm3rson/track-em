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
import type { PaymentRow } from "../types";

export type EditPaymentModalProps = {
  visible: boolean;
  payment: PaymentRow | null;
  remainingTotal: number;
  saving: boolean;
  onClose: () => void;
  onSave: (payment: PaymentRow, amount: number, note?: string) => Promise<void> | void;
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
  const [note, setNote] = useState("");
  const initialRef = useRef<{ amountText: string; note: string } | null>(null);

  useEffect(() => {
    if (visible && payment) {
      const nextAmountText = String(payment.amount ?? 0);
      const nextNote = payment.note ?? "";
      setAmountText(nextAmountText);
      setNote(nextNote);
      initialRef.current = { amountText: nextAmountText, note: nextNote };
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
    const trimmedNote = note.trim();
    await onSave(payment, amt, trimmedNote ? trimmedNote : undefined);
  };

  const initial = initialRef.current;
  const isDirty = !!initial && (amountText !== initial.amountText || note !== initial.note);

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

        <FormLabel>Payment amount</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Payment amount"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="e.g. 500"
            placeholderTextColor={colors.placeholderText}
            style={fieldInputStyle}
          />
        </FieldShell>

        <FormLabel optional>Payment note</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Payment note"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Bank transfer"
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
          cancelAccessibilityLabel="Cancel payment edit"
          submitAccessibilityLabel={saving ? "Saving payment changes" : "Save payment changes"}
          cancelDisabled={saving}
          submitDisabled={saving}
          submitLoading={saving}
        />
      </ModalContentCard>
    </ModalCard>
  );
}
