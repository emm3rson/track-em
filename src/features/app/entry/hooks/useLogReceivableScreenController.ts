import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import { loadLentMoneyAccounts, saveReceivableEntry } from "../../../entry/service";
import type { EntryAccountOption } from "../types";

type ReceivableDraft = {
  person: string;
  amountText: string;
  dateIso: string;
  note: string;
  targetPaymentDateIso: string | null;
  preferredAccountId: number | null;
};

export function useLogReceivableScreenController() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [person, setPerson] = useState("");
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [targetPaymentDate, setTargetPaymentDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<EntryAccountOption[]>([]);
  const [preferredAccountId, setPreferredAccountId] = useState<number | null>(null);

  const initialDraftRef = useRef<ReceivableDraft>({
    person: "",
    amountText: "",
    dateIso: isoDate(new Date()),
    note: "",
    targetPaymentDateIso: null,
    preferredAccountId: null,
  });

  useEffect(() => {
    void loadLentMoneyAccounts().then((rows) => setAccounts(rows ?? []));
  }, []);

  const amountValidation = useMemo(() => {
    const parsed = parseNumber(amountText.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false as const, error: "Enter a positive amount." };
    }
    return { valid: true as const, value: parsed };
  }, [amountText]);

  const personError = person.trim() ? null : "Person is required.";

  const draft = useMemo<ReceivableDraft>(
    () => ({
      person,
      amountText,
      dateIso: isoDate(date),
      note,
      targetPaymentDateIso: targetPaymentDate ? isoDate(targetPaymentDate) : null,
      preferredAccountId,
    }),
    [amountText, date, note, person, preferredAccountId, targetPaymentDate]
  );

  const isDirty = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      initial.person !== draft.person ||
      initial.amountText !== draft.amountText ||
      initial.dateIso !== draft.dateIso ||
      initial.note !== draft.note ||
      initial.targetPaymentDateIso !== draft.targetPaymentDateIso ||
      initial.preferredAccountId !== draft.preferredAccountId
    );
  }, [draft]);

  const saveDisabled = saving || !amountValidation.valid || !person.trim();

  const cancel = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    confirmDiscardChanges(() => navigation.goBack());
  }, [isDirty, navigation, saving]);

  const submit = useCallback(async () => {
    const trimmedPerson = person.trim();
    if (!trimmedPerson) {
      Alert.alert("Person required", "Enter the person name.");
      return;
    }
    if (!amountValidation.valid) {
      Alert.alert("Invalid amount", amountValidation.error);
      return;
    }

    try {
      setSaving(true);
      const result = await saveReceivableEntry({
        person: trimmedPerson,
        amount: amountValidation.value,
        dateIso: isoDate(date),
        note: note.trim() ? note.trim() : null,
        targetPaymentDate: targetPaymentDate ? isoDate(targetPaymentDate) : null,
        preferredAccountId: preferredAccountId ?? null,
      });
      Alert.alert("Saved", result.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert(
        "Unable to save receivable",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [amountValidation, date, navigation, note, person, preferredAccountId, targetPaymentDate]);

  return {
    person,
    setPerson,
    personError,
    amountText,
    setAmountText,
    amountError: amountValidation.valid ? null : amountValidation.error,
    date,
    setDate,
    note,
    setNote,
    targetPaymentDate,
    setTargetPaymentDate,
    accounts,
    preferredAccountId,
    setPreferredAccountId,
    saving,
    saveDisabled,
    cancel,
    submit,
  };
}
