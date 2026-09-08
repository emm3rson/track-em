import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ModalCard } from "../../../components/ModalCard";
import { ModalContentCard } from "../../../components/ModalContentCard";
import { Text } from "../../../components/Themed";
import { FieldShell, getFieldInputStyle } from "../../../components/ui/FieldShell";
import { FormLabel } from "../../../components/ui/FormLabel";
import { ModalFormActions } from "../../../components/ui/ModalFormActions";
import { ModalHeaderBar } from "../../../components/ui/ModalHeaderBar";
import { spacing } from "../../../styles/tokens";
import { useTheme } from "../../../theme/ThemeProvider";
import { parseNumber } from "../../../utils/parseNumber";
import { isoDate } from "../../../utils/dates";
import { confirmDiscardChanges } from "../../../utils/confirm";

export type ReceivableModalSave = {
  person: string;
  amount: number;
  dateIso: string;
  note?: string;
  targetPaymentDate?: string | null;
};

export type ReceivableModalProps = {
  visible: boolean;
  mode: "add" | "edit";
  initialValues?: {
    person: string;
    amount: number;
    date: string;
    note: string | null;
    targetPaymentDate: string | null;
  };
  saving: boolean;
  onClose: () => void;
  onSave: (values: ReceivableModalSave) => Promise<void> | void;
};

export function ReceivableModal({
  visible,
  mode,
  initialValues,
  saving,
  onClose,
  onSave,
}: ReceivableModalProps) {
  const { colors } = useTheme();
  const fieldInputStyle = getFieldInputStyle(colors);
  const [person, setPerson] = useState("");
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [note, setNote] = useState("");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const initialRef = useRef<{
    person: string;
    amountText: string;
    dateIso: string;
    note: string;
    targetDateIso: string | null;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      const nextPerson = initialValues?.person ?? "";
      const nextAmountText =
        initialValues?.amount !== undefined ? String(initialValues.amount) : "";
      const nextDate = initialValues?.date ? new Date(initialValues.date) : new Date();
      const nextNote = initialValues?.note ?? "";
      const nextTargetDate = initialValues?.targetPaymentDate
        ? new Date(initialValues.targetPaymentDate)
        : null;

      setPerson(nextPerson);
      setAmountText(nextAmountText);
      setDate(nextDate);
      setNote(nextNote);
      setTargetDate(nextTargetDate);

      initialRef.current = {
        person: nextPerson,
        amountText: nextAmountText,
        dateIso: isoDate(nextDate),
        note: nextNote,
        targetDateIso: nextTargetDate ? isoDate(nextTargetDate) : null,
      };
    } else {
      setShowDate(false);
      setShowTargetDatePicker(false);
      initialRef.current = null;
    }
  }, [visible, initialValues]);

  const saveLabel = useMemo(() => {
    if (saving) return "Saving...";
    return mode === "edit" ? "Save Changes" : "Save";
  }, [saving, mode]);

  const heading = mode === "edit" ? "Edit Receivable" : "Add Receivable";

  const handleSave = async () => {
    const trimmedPerson = person.trim();
    if (!trimmedPerson) return Alert.alert("Person is required");

    const amount = parseNumber(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      return Alert.alert("Enter a positive amount");
    }

    const trimmedNote = note.trim();

    await onSave({
      person: trimmedPerson,
      amount,
      dateIso: isoDate(date),
      note: trimmedNote ? trimmedNote : undefined,
      targetPaymentDate: targetDate ? isoDate(targetDate) : null,
    });
  };

  const initial = initialRef.current;
  const isDirty =
    !!initial &&
    (person !== initial.person ||
      amountText !== initial.amountText ||
      isoDate(date) !== initial.dateIso ||
      note !== initial.note ||
      (targetDate ? isoDate(targetDate) : null) !== initial.targetDateIso);

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
        <ModalHeaderBar title={heading} />

        <FormLabel>Person</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Person name"
            value={person}
            onChangeText={setPerson}
            placeholder="e.g. Juan Dela Cruz"
            placeholderTextColor={colors.placeholderText}
            style={fieldInputStyle}
          />
        </FieldShell>

        <FormLabel>Amount</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Receivable amount"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="e.g. 1500"
            placeholderTextColor={colors.placeholderText}
            style={fieldInputStyle}
          />
        </FieldShell>

        {mode === "add" ? (
          <>
            <FormLabel>Date</FormLabel>
            <Pressable onPress={() => setShowDate(true)}>
              <FieldShell>
                <Text>{date.toLocaleDateString("en-PH")}</Text>
              </FieldShell>
            </Pressable>
            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                onChange={(e, d) => {
                  setShowDate(false);
                  if (d) setDate(d);
                }}
              />
            )}
          </>
        ) : null}

        <FormLabel optional>Target payment date</FormLabel>
        <FieldShell
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <Pressable onPress={() => setShowTargetDatePicker(true)} style={{ flex: 1 }}>
            <Text style={{ color: targetDate ? colors.text : colors.placeholderText }}>
              {targetDate ? targetDate.toLocaleDateString("en-PH") : "Not set"}
            </Text>
          </Pressable>
          {targetDate ? (
            <Pressable onPress={() => setTargetDate(null)}>
              <Text style={{ fontWeight: "700", color: colors.danger }}>Clear</Text>
            </Pressable>
          ) : null}
        </FieldShell>
        {showTargetDatePicker && (
          <DateTimePicker
            value={targetDate ?? new Date()}
            mode="date"
            onChange={(e, d) => {
              setShowTargetDatePicker(false);
              if (d) setTargetDate(d);
            }}
          />
        )}

        <FormLabel optional>Note</FormLabel>
        <FieldShell>
          <TextInput
            accessibilityLabel="Receivable note"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Paid for group dinner"
            placeholderTextColor={colors.placeholderText}
            style={fieldInputStyle}
          />
        </FieldShell>

        <ModalFormActions
          onCancel={attemptClose}
          onSubmit={() => {
            void handleSave();
          }}
          submitLabel={saveLabel}
          cancelAccessibilityLabel="Cancel receivable changes"
          submitAccessibilityLabel={saving ? "Saving receivable" : "Save receivable"}
          cancelDisabled={saving}
          submitDisabled={saving}
          submitLoading={saving}
        />
      </ModalContentCard>
    </ModalCard>
  );
}
