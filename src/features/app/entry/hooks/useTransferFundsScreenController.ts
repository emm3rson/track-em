import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { php } from "../../../../utils/currency";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import { loadTransferAccounts, saveTransferEntry } from "../../../entry/service";
import type { EntryAccountOption } from "../types";

type TransferDraft = {
  fromAccountId: number | null;
  toAccountId: number | null;
  dateIso: string;
  amountText: string;
  feeText: string;
  note: string;
};

type UseTransferFundsScreenControllerParams = {
  lockedAccountId?: number | null;
  lockedDirection?: "from" | "to";
};

export function useTransferFundsScreenController(params?: UseTransferFundsScreenControllerParams) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lockedAccountId = params?.lockedAccountId ?? null;
  const lockedDirection = params?.lockedDirection;
  const lockFromAccount = lockedAccountId != null && lockedDirection === "from";
  const lockToAccount = lockedAccountId != null && lockedDirection === "to";
  const [accounts, setAccounts] = useState<EntryAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [amountText, setAmountText] = useState("");
  const [feeText, setFeeText] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const initialDraftRef = useRef<TransferDraft | null>(null);

  const reloadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const rows = await loadTransferAccounts();
      let nextFrom: number | null = rows[0]?.id ?? null;
      let nextTo: number | null = rows[1]?.id ?? null;
      if (nextTo === nextFrom) {
        nextTo = rows.find((item) => item.id !== nextFrom)?.id ?? null;
      }

      if (lockFromAccount && lockedAccountId != null) {
        nextFrom = lockedAccountId;
        nextTo = rows.find((item) => item.id !== lockedAccountId)?.id ?? null;
      }
      if (lockToAccount && lockedAccountId != null) {
        nextTo = lockedAccountId;
        nextFrom = rows.find((item) => item.id !== lockedAccountId)?.id ?? null;
      }

      setAccounts(rows);
      setFromAccountId(nextFrom);
      setToAccountId(nextTo);

      if (!initialDraftRef.current) {
        initialDraftRef.current = {
          fromAccountId: nextFrom,
          toAccountId: nextTo,
          dateIso: isoDate(new Date()),
          amountText: "",
          feeText: "",
          note: "",
        };
      }
    } catch (error) {
      Alert.alert(
        "Unable to load transfer accounts",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoadingAccounts(false);
    }
  }, [lockFromAccount, lockToAccount, lockedAccountId]);

  useEffect(() => {
    if (lockFromAccount && lockedAccountId != null) {
      setFromAccountId(lockedAccountId);
    }
    if (lockToAccount && lockedAccountId != null) {
      setToAccountId(lockedAccountId);
    }
  }, [lockFromAccount, lockToAccount, lockedAccountId]);

  useEffect(() => {
    void reloadAccounts();
  }, [reloadAccounts]);

  const amountValidation = useMemo(() => {
    const parsed = parseNumber(amountText.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false as const, error: "Received amount must be positive." };
    }
    return { valid: true as const, value: parsed };
  }, [amountText]);

  const feeValidation = useMemo(() => {
    if (!feeText.trim()) {
      return { valid: true as const, value: 0 };
    }
    const parsed = parseNumber(feeText.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { valid: false as const, error: "Convenience fee cannot be negative." };
    }
    return { valid: true as const, value: parsed };
  }, [feeText]);

  const hasEnoughAccounts = accounts.length >= 2;
  const accountsAreDifferent =
    fromAccountId != null && toAccountId != null && fromAccountId !== toAccountId;

  const draft = useMemo<TransferDraft>(
    () => ({
      fromAccountId,
      toAccountId,
      dateIso: isoDate(date),
      amountText,
      feeText,
      note,
    }),
    [amountText, date, feeText, fromAccountId, note, toAccountId]
  );

  const isDirty = useMemo(() => {
    const initial = initialDraftRef.current;
    if (!initial) return false;
    return (
      initial.fromAccountId !== draft.fromAccountId ||
      initial.toAccountId !== draft.toAccountId ||
      initial.dateIso !== draft.dateIso ||
      initial.amountText !== draft.amountText ||
      initial.feeText !== draft.feeText ||
      initial.note !== draft.note
    );
  }, [draft]);

  const saveDisabled =
    saving ||
    loadingAccounts ||
    !hasEnoughAccounts ||
    !accountsAreDifferent ||
    !amountValidation.valid ||
    !feeValidation.valid ||
    fromAccountId == null ||
    toAccountId == null;

  const cancel = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    confirmDiscardChanges(() => navigation.goBack());
  }, [isDirty, navigation, saving]);

  const submit = useCallback(async () => {
    if (!hasEnoughAccounts) {
      Alert.alert("Transfer unavailable", "At least two active accounts are required.");
      return;
    }
    if (!amountValidation.valid) {
      Alert.alert("Invalid amount", amountValidation.error);
      return;
    }
    if (!feeValidation.valid) {
      Alert.alert("Invalid fee", feeValidation.error);
      return;
    }
    if (fromAccountId == null || toAccountId == null) {
      Alert.alert("Account required", "Select both source and destination accounts.");
      return;
    }
    if (fromAccountId === toAccountId) {
      Alert.alert("Invalid transfer", "Source and destination accounts must be different.");
      return;
    }

    const persist = async () => {
      try {
        setSaving(true);
        const result = await saveTransferEntry({
          fromAccountId,
          toAccountId,
          dateIso: isoDate(date),
          receivedAmount: amountValidation.value,
          feeAmount: feeValidation.value,
          note: note.trim() ? note.trim() : null,
        });
        Alert.alert("Saved", result.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
      } catch (error) {
        Alert.alert(
          "Unable to save transfer",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSaving(false);
      }
    };

    const source = accounts.find((item) => item.id === fromAccountId);
    if (source) {
      const sourceDeduction = amountValidation.value + feeValidation.value;
      const projectedBalance = (source.balance ?? 0) - sourceDeduction;
      if (projectedBalance < 0) {
        Alert.alert(
          "Low balance warning",
          `${source.name} will become ${php.format(projectedBalance)} after this transfer.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Transfer anyway", style: "destructive", onPress: () => void persist() },
          ]
        );
        return;
      }
    }

    await persist();
  }, [
    accounts,
    amountValidation,
    feeValidation,
    date,
    fromAccountId,
    hasEnoughAccounts,
    navigation,
    note,
    toAccountId,
  ]);

  return {
    accounts,
    loadingAccounts,
    hasEnoughAccounts,
    fromAccountId,
    setFromAccountId,
    toAccountId,
    setToAccountId,
    date,
    setDate,
    amountText,
    setAmountText,
    amountError: amountValidation.valid ? null : amountValidation.error,
    feeText,
    setFeeText,
    feeError: feeValidation.valid ? null : feeValidation.error,
    note,
    setNote,
    saving,
    saveDisabled,
    cancel,
    submit,
    reloadAccounts,
    lockFromAccount,
    lockToAccount,
  };
}
