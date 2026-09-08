import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, type TextInput } from "react-native";

import type { AccountEditState } from "../types";
import type { AccountCategory } from "../../../data/types";
import { php } from "../../../utils/currency";
import { confirmDiscardChanges } from "../../../utils/confirm";
import { parseNumber } from "../../../utils/parseNumber";
import { saveAccount } from "../service";
import { filterInstitutions } from "../institutionMatching";

type UseAccountFormModalControllerParams = {
  editing: AccountEditState;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

function sanitizeCurrencyInput(value: string): string {
  let result = "";
  let hasDot = false;
  let isNegative = false;
  const raw = value.replace(/,/g, "");

  for (const char of raw) {
    if (char === "-" && !result && !hasDot && !isNegative) {
      isNegative = true;
      continue;
    }
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }
    if (char === "." && !hasDot) {
      if (!result) result = "0";
      result += ".";
      hasDot = true;
    }
  }

  if (!result) return "";

  const hasTrailingDot = result.endsWith(".");
  const [integerRaw, decimalRaw] = result.split(".");
  const normalizedInteger = integerRaw.replace(/^0+(?=\d)/, "");
  const signPrefix = isNegative ? "-" : "";

  if (hasTrailingDot) return `${signPrefix}${normalizedInteger}.`;
  if (decimalRaw !== undefined) return `${signPrefix}${normalizedInteger}.${decimalRaw}`;
  return `${signPrefix}${normalizedInteger}`;
}

function formatCurrencyInput(value: string): string {
  if (!value) return "";

  const isNegative = value.startsWith("-");
  const unsigned = isNegative ? value.slice(1) : value;
  const hasTrailingDot = unsigned.endsWith(".");
  const [integerPart, decimalPart] = unsigned.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const signPrefix = isNegative ? "-" : "";

  if (hasTrailingDot) return `${signPrefix}${groupedInteger}.`;
  if (decimalPart !== undefined) return `${signPrefix}${groupedInteger}.${decimalPart}`;
  return `${signPrefix}${groupedInteger}`;
}

function toFormattedCurrencyText(value: number | string): string {
  return formatCurrencyInput(sanitizeCurrencyInput(String(value)));
}

export function useAccountFormModalController({
  editing,
  onClose,
  onSaved,
}: UseAccountFormModalControllerParams) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [showInstitutionSuggestions, setShowInstitutionSuggestions] = useState(false);
  const institutionInputRef = useRef<TextInput | null>(null);
  const [balanceText, setBalanceText] = useState("");
  const [goalAmountText, setGoalAmountText] = useState("");
  const [accountCategory, setAccountCategory] = useState<AccountCategory>("SAVINGS");
  const [includeInTotals, setIncludeInTotals] = useState(true);

  const initialEditRef = useRef<{
    name: string;
    institution: string;
    balanceText: string;
    goalAmountText: string;
    accountCategory: AccountCategory;
    includeInTotals: boolean;
  } | null>(null);

  useEffect(() => {
    if (!editing) {
      setName("");
      setInstitution("");
      setShowInstitutionSuggestions(false);
      setBalanceText("");
      setGoalAmountText("");
      setAccountCategory("SAVINGS");
      setIncludeInTotals(true);
      initialEditRef.current = null;
      return;
    }

    if (editing.mode === "add") {
      setName("");
      setInstitution("");
      setShowInstitutionSuggestions(false);
      setBalanceText("");
      setGoalAmountText("");
      setAccountCategory("SAVINGS");
      setIncludeInTotals(true);
      initialEditRef.current = {
        name: "",
        institution: "",
        balanceText: "",
        goalAmountText: "",
        accountCategory: "SAVINGS",
        includeInTotals: true,
      };
      return;
    }

    const account = editing.account;
    if (!account) return;

    setName(account.name);
    setInstitution(account.institution ?? "");
    setShowInstitutionSuggestions(false);
    setBalanceText(editing.type === "SOURCE" ? "" : toFormattedCurrencyText(account.balance ?? 0));
    setGoalAmountText(
      account.goalAmount != null ? toFormattedCurrencyText(account.goalAmount) : ""
    );
    setAccountCategory(account.accountCategory ?? "SAVINGS");
    setIncludeInTotals(account.includeInTotals !== 0);
    initialEditRef.current = {
      name: account.name,
      institution: account.institution ?? "",
      balanceText: editing.type === "SOURCE" ? "" : toFormattedCurrencyText(account.balance ?? 0),
      goalAmountText: account.goalAmount != null ? toFormattedCurrencyText(account.goalAmount) : "",
      accountCategory: account.accountCategory ?? "SAVINGS",
      includeInTotals: account.includeInTotals !== 0,
    };
  }, [editing]);

  const institutionSuggestions = useMemo(() => {
    if (!showInstitutionSuggestions || !institution.trim()) return [];
    return filterInstitutions(institution, 12);
  }, [institution, showInstitutionSuggestions]);

  const balanceLabel = editing?.type === "SOURCE" ? "Current balance" : "Starting balance";
  const balancePlaceholder =
    editing?.mode === "edit" && editing.type === "SOURCE"
      ? php.format(editing.account?.balance ?? 0)
      : "e.g. 10,000";
  const heading = editing?.mode === "add" ? "Add Account" : "Edit Account";

  const isDirty = useMemo(() => {
    if (!editing || !initialEditRef.current) return false;
    const initial = initialEditRef.current;
    return (
      name !== initial.name ||
      institution !== initial.institution ||
      balanceText !== initial.balanceText ||
      goalAmountText !== initial.goalAmountText ||
      (editing.type === "SAVINGS" && accountCategory !== initial.accountCategory) ||
      includeInTotals !== initial.includeInTotals
    );
  }, [accountCategory, balanceText, editing, goalAmountText, includeInTotals, institution, name]);

  const attemptClose = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    confirmDiscardChanges(onClose);
  }, [isDirty, onClose, saving]);

  const onSave = useCallback(async () => {
    if (!editing) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Name is required");
      return;
    }

    const trimmedBalance = balanceText.trim();
    // For SAVINGS accounts, use existing balance when editing, or 0 for new accounts
    const isSavingsAccount = editing.type === "SAVINGS";
    const useExistingBalance =
      (editing.mode === "edit" && editing.type === "SOURCE" && trimmedBalance === "") ||
      (editing.mode === "edit" && isSavingsAccount);
    const balanceTextToParse = useExistingBalance
      ? String(editing.account?.balance ?? 0)
      : isSavingsAccount && editing.mode === "add"
        ? "0"
        : trimmedBalance;
    if (!balanceTextToParse) {
      Alert.alert("Enter a valid number for balance");
      return;
    }

    const initialBalance = parseNumber(balanceTextToParse);
    if (!Number.isFinite(initialBalance)) {
      Alert.alert("Enter a valid number for balance");
      return;
    }

    const goalAmountValue =
      editing.type === "SAVINGS"
        ? (() => {
            const trimmedGoal = goalAmountText.trim();
            if (!trimmedGoal) return null;
            const parsed = parseNumber(trimmedGoal);
            if (!Number.isFinite(parsed)) {
              Alert.alert("Enter a valid number for goal amount");
              return undefined;
            }
            if (parsed < 0) {
              Alert.alert("Goal amount cannot be negative");
              return undefined;
            }
            return parsed;
          })()
        : null;

    if (editing.type === "SAVINGS" && goalAmountValue === undefined) {
      return;
    }

    const includeInTotalsValue = includeInTotals ? 1 : 0;
    const persistSave = async () => {
      try {
        setSaving(true);
        await saveAccount({
          mode: editing.mode,
          type: editing.type,
          accountId: editing.account?.id,
          name: trimmedName,
          institution: institution.trim() || null,
          initialBalance,
          goalAmount: goalAmountValue ?? null,
          accountCategory,
          includeInTotals: includeInTotalsValue,
        });
        await onSaved();
        onClose();
      } finally {
        setSaving(false);
      }
    };

    if (editing.mode === "edit" && editing.type === "SAVINGS" && initialEditRef.current) {
      const previousBalance = parseNumber(initialEditRef.current.balanceText || "0");
      if (Number.isFinite(previousBalance) && Math.abs(previousBalance - initialBalance) > 0.005) {
        Alert.alert(
          "Change starting balance?",
          "Starting balance affects all savings calculations. Are you sure you want to update it?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Change", style: "destructive", onPress: () => void persistSave() },
          ]
        );
        return;
      }
    }

    await persistSave();
  }, [
    accountCategory,
    balanceText,
    editing,
    goalAmountText,
    includeInTotals,
    institution,
    name,
    onClose,
    onSaved,
  ]);

  const onChangeInstitution = useCallback((nextValue: string) => {
    setInstitution(nextValue);
    setShowInstitutionSuggestions(true);
  }, []);

  const applyInstitutionSuggestion = useCallback((institutionName: string) => {
    institutionInputRef.current?.blur();
    Keyboard.dismiss();
    setInstitution(institutionName);
    setShowInstitutionSuggestions(false);
  }, []);

  const onChangeBalanceText = useCallback((nextValue: string) => {
    setBalanceText(formatCurrencyInput(sanitizeCurrencyInput(nextValue)));
  }, []);

  const onChangeGoalAmountText = useCallback((nextValue: string) => {
    setGoalAmountText(formatCurrencyInput(sanitizeCurrencyInput(nextValue)));
  }, []);

  return {
    saving,
    name,
    setName,
    institution,
    institutionInputRef,
    onChangeInstitution,
    showInstitutionSuggestions,
    institutionSuggestions,
    applyInstitutionSuggestion,
    balanceText,
    onChangeBalanceText,
    goalAmountText,
    onChangeGoalAmountText,
    accountCategory,
    setAccountCategory,
    setIncludeInTotals,
    balanceLabel,
    balancePlaceholder,
    heading,
    attemptClose,
    onSave,
  };
}
