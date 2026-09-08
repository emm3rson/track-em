import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import { loadLentMoneyAccounts, saveLentMoneyEntry } from "../../../entry/service";
import type { EntryAccountOption } from "../types";

type LentMoneyDraft = {
  person: string;
  amountText: string;
  dateIso: string;
  note: string;
  targetPaymentDateIso: string | null;
  accountId: number | null;
};

type UseLogLentMoneyScreenControllerParams = {
  lockedAccountId?: number | null;
};

export function useLogLentMoneyScreenController({
  lockedAccountId = null,
}: UseLogLentMoneyScreenControllerParams = {}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [person, setPerson] = useState("");
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [targetPaymentDate, setTargetPaymentDate] = useState<Date | null>(null);
  const [accountId, setAccountId] = useState<number | null>(lockedAccountId);
  const [accounts, setAccounts] = useState<EntryAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);

  const initialDraftRef = useRef<LentMoneyDraft>({
    person: "",
    amountText: "",
    dateIso: isoDate(new Date()),
    note: "",
    targetPaymentDateIso: null,
    accountId: lockedAccountId,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingAccounts(true);
      try {
        const rows = await loadLentMoneyAccounts();
        if (!cancelled) {
          setAccounts(rows);
          if (lockedAccountId == null && rows.length > 0 && accountId == null) {
            setAccountId(rows[0].id);
          }
        }
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amountValidation = useMemo(() => {
    const parsed = parseNumber(amountText.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false as const, error: "Enter a positive amount." };
    }
    return { valid: true as const, value: parsed };
  }, [amountText]);

  const personError = person.trim() ? null : "Person is required.";

  const draft = useMemo<LentMoneyDraft>(
    () => ({
      person,
      amountText,
      dateIso: isoDate(date),
      note,
      targetPaymentDateIso: targetPaymentDate ? isoDate(targetPaymentDate) : null,
      accountId,
    }),
    [amountText, date, note, person, targetPaymentDate, accountId]
  );

  const isDirty = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      initial.person !== draft.person ||
      initial.amountText !== draft.amountText ||
      initial.dateIso !== draft.dateIso ||
      initial.note !== draft.note ||
      initial.targetPaymentDateIso !== draft.targetPaymentDateIso ||
      initial.accountId !== draft.accountId
    );
  }, [draft]);

  const saveDisabled = saving || !amountValidation.valid || !person.trim() || accountId == null;

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
    if (accountId == null) {
      Alert.alert("Account required", "Select an account to deduct from.");
      return;
    }

    try {
      setSaving(true);
      const result = await saveLentMoneyEntry({
        person: trimmedPerson,
        amount: amountValidation.value,
        dateIso: isoDate(date),
        note: note.trim() ? note.trim() : null,
        targetPaymentDate: targetPaymentDate ? isoDate(targetPaymentDate) : null,
        accountId,
      });
      Alert.alert("Saved", result.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert("Unable to save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [amountValidation, accountId, date, navigation, note, person, targetPaymentDate]);

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
    accountId,
    setAccountId,
    accounts,
    loadingAccounts,
    saving,
    saveDisabled,
    cancel,
    submit,
  };
}
