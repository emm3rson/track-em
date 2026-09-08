import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import { loadIncomeAccounts, saveIncomeEntry } from "../../../entry/service";
import type { EntryAccountOption } from "../types";

type IncomeDraft = {
  accountId: number | null;
  dateIso: string;
  amountText: string;
  note: string;
};

type UseLogIncomeScreenControllerParams = {
  lockedAccountId?: number | null;
};

export function useLogIncomeScreenController(params?: UseLogIncomeScreenControllerParams) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lockedAccountId = params?.lockedAccountId ?? null;
  const lockAccount = lockedAccountId != null;
  const [accounts, setAccounts] = useState<EntryAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const initialDraftRef = useRef<IncomeDraft | null>(null);

  const reloadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const rows = await loadIncomeAccounts();
      const selectedId = lockAccount ? lockedAccountId : (rows[0]?.id ?? null);
      setAccounts(rows);
      setAccountId(selectedId);

      if (!initialDraftRef.current) {
        initialDraftRef.current = {
          accountId: selectedId,
          dateIso: isoDate(new Date()),
          amountText: "",
          note: "",
        };
      }
    } catch (error) {
      Alert.alert(
        "Unable to load income accounts",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoadingAccounts(false);
    }
  }, [lockAccount, lockedAccountId]);

  useEffect(() => {
    if (lockAccount && lockedAccountId != null) {
      setAccountId(lockedAccountId);
    }
  }, [lockAccount, lockedAccountId]);

  useEffect(() => {
    void reloadAccounts();
  }, [reloadAccounts]);

  const amountValidation = useMemo(() => {
    const parsed = parseNumber(amountText.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false as const, error: "Enter a positive amount." };
    }
    return { valid: true as const, value: parsed };
  }, [amountText]);

  const draft = useMemo<IncomeDraft>(
    () => ({
      accountId,
      dateIso: isoDate(date),
      amountText,
      note,
    }),
    [accountId, amountText, date, note]
  );

  const isDirty = useMemo(() => {
    const initial = initialDraftRef.current;
    if (!initial) return false;
    return (
      initial.accountId !== draft.accountId ||
      initial.dateIso !== draft.dateIso ||
      initial.amountText !== draft.amountText ||
      initial.note !== draft.note
    );
  }, [draft]);

  const saveDisabled =
    saving ||
    loadingAccounts ||
    !amountValidation.valid ||
    accountId == null ||
    (!lockAccount && accounts.length === 0);

  const cancel = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    confirmDiscardChanges(() => navigation.goBack());
  }, [isDirty, navigation, saving]);

  const submit = useCallback(async () => {
    if (!amountValidation.valid) {
      Alert.alert("Invalid amount", amountValidation.error);
      return;
    }
    if (!accountId) {
      Alert.alert("Account required", "Select a wallet.");
      return;
    }

    try {
      setSaving(true);
      const result = await saveIncomeEntry({
        accountId,
        dateIso: isoDate(date),
        amount: amountValidation.value,
        note: note.trim() ? note.trim() : null,
      });
      Alert.alert("Saved", result.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert(
        "Unable to save income",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [accountId, amountValidation, date, navigation, note]);

  return {
    accounts,
    loadingAccounts,
    accountId,
    setAccountId,
    date,
    setDate,
    amountText,
    setAmountText,
    amountError: amountValidation.valid ? null : amountValidation.error,
    note,
    setNote,
    saving,
    saveDisabled,
    cancel,
    submit,
    reloadAccounts,
    lockAccount,
  };
}
