import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { evaluateAmountExpression } from "../../../../utils/amountExpression";
import { php } from "../../../../utils/currency";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import { loadExpenseEntryMeta, saveExpenseEntry } from "../../../entry/service";
import type { ExpenseCategoryRow as ExpenseCategory } from "../../../../data/types";

type ExpenseDraft = {
  dateIso: string;
  amountText: string;
  categoryId: number | null;
  accountId: number | null;
  note: string;
};

type AmountValidation = { valid: true; value: number } | { valid: false; error: string };

const EMPTY_AMOUNT_ERROR = "Enter an amount.";

type UseLogExpenseScreenControllerParams = {
  lockedAccountId?: number | null;
};

export function useLogExpenseScreenController(params?: UseLogExpenseScreenControllerParams) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lockedAccountId = params?.lockedAccountId ?? null;
  const lockAccount = lockedAccountId != null;
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<
    {
      id: number;
      name: string;
      institution: string | null;
      balance: number;
      type: "SOURCE" | "SAVINGS";
    }[]
  >([]);

  const [amountText, setAmountText] = useState("");
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const initialDraftRef = useRef<ExpenseDraft | null>(null);

  const reloadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const meta = await loadExpenseEntryMeta();
      const dedupedCategories = dedupeCategories(meta.categories ?? []);
      const selectedCategoryId = dedupedCategories[0]?.id ?? null;

      setCategories(dedupedCategories);
      setAccounts(
        (meta.accounts ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          institution: item.institution,
          balance: item.balance ?? 0,
        }))
      );
      if (lockAccount && lockedAccountId != null) {
        setAccountId(lockedAccountId);
      }
      setCategoryId(selectedCategoryId);

      if (!initialDraftRef.current) {
        initialDraftRef.current = {
          dateIso: isoDate(new Date()),
          amountText: "",
          categoryId: selectedCategoryId,
          accountId: lockAccount ? lockedAccountId : null,
          note: "",
        };
      }
    } catch (error) {
      Alert.alert(
        "Unable to load expense form",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoadingMeta(false);
    }
  }, [lockAccount, lockedAccountId]);

  useEffect(() => {
    if (lockAccount && lockedAccountId != null) {
      setAccountId(lockedAccountId);
    }
  }, [lockAccount, lockedAccountId]);

  useEffect(() => {
    void reloadMeta();
  }, [reloadMeta]);

  const amountValidation = useMemo<AmountValidation>(() => {
    const trimmed = amountText.trim();
    if (!trimmed) {
      return { valid: false, error: EMPTY_AMOUNT_ERROR };
    }

    if (trimmed.startsWith("=")) {
      const result = evaluateAmountExpression(trimmed);
      if (!result.ok) {
        return { valid: false, error: result.error };
      }
      if (!Number.isFinite(result.value) || result.value <= 0) {
        return { valid: false, error: "Enter a valid amount greater than 0." };
      }
      return { valid: true, value: result.value };
    }

    const parsed = parseNumber(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false, error: "Enter a valid amount greater than 0." };
    }
    return { valid: true, value: parsed };
  }, [amountText]);

  const amountError =
    !amountValidation.valid && amountValidation.error !== EMPTY_AMOUNT_ERROR
      ? amountValidation.error
      : null;

  const hasCategories = categories.length > 0;

  const saveDisabled =
    saving || loadingMeta || !hasCategories || !amountValidation.valid || (categoryId ?? 0) <= 0;

  const currentDraft = useMemo<ExpenseDraft>(
    () => ({
      dateIso: isoDate(date),
      amountText,
      categoryId,
      accountId,
      note,
    }),
    [accountId, amountText, categoryId, date, note]
  );

  const isDirty = useMemo(() => {
    const initial = initialDraftRef.current;
    if (!initial) return false;
    return (
      initial.dateIso !== currentDraft.dateIso ||
      initial.amountText !== currentDraft.amountText ||
      initial.categoryId !== currentDraft.categoryId ||
      initial.accountId !== currentDraft.accountId ||
      initial.note !== currentDraft.note
    );
  }, [currentDraft]);

  const cancel = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    confirmDiscardChanges(() => navigation.goBack());
  }, [isDirty, navigation, saving]);

  const submit = useCallback(
    async (logAnother?: boolean) => {
      if (!amountValidation.valid) {
        Alert.alert("Invalid amount", amountValidation.error);
        return;
      }
      if (!categoryId) {
        Alert.alert("Category required", "Select a category before saving.");
        return;
      }

      const persist = async () => {
        try {
          setSaving(true);
          const result = await saveExpenseEntry({
            dateIso: isoDate(date),
            amount: amountValidation.value,
            categoryId,
            accountId,
            note: note.trim() ? note.trim() : null,
          });

          if (logAnother) {
            setAmountText("");
            setNote("");
            setCalculatorExpression("");
            Alert.alert("Saved", "Expense logged successfully.");
          } else {
            Alert.alert("Saved", result.message, [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          }
        } catch (error) {
          Alert.alert(
            "Unable to save expense",
            error instanceof Error ? error.message : "Please try again."
          );
        } finally {
          setSaving(false);
        }
      };

      if (accountId != null) {
        const account = accounts.find((row) => row.id === accountId);
        if (account) {
          const projectedBalance = (account.balance ?? 0) - amountValidation.value;
          if (projectedBalance < 0) {
            Alert.alert(
              "Low balance warning",
              `${account.name} will become ${php.format(projectedBalance)} after this expense.`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Save anyway", style: "destructive", onPress: () => void persist() },
              ]
            );
            return;
          }
        }
      }

      await persist();
    },
    [accountId, accounts, amountValidation, categoryId, date, navigation, note]
  );

  const openCalculator = useCallback(() => {
    const trimmed = amountText.trim();
    if (!trimmed) {
      setCalculatorExpression("");
    } else if (trimmed.startsWith("=")) {
      setCalculatorExpression(trimmed.slice(1).trim());
    } else {
      const parsed = parseNumber(trimmed);
      setCalculatorExpression(Number.isFinite(parsed) ? trimmed : "");
    }
    setShowCalculator(true);
  }, [amountText]);

  const closeCalculator = useCallback(() => {
    setShowCalculator(false);
  }, []);

  const applyCalculatorResult = useCallback((value: number) => {
    setAmountText(normalizeAmountText(value));
    setShowCalculator(false);
  }, []);

  return {
    loadingMeta,
    categories,
    accounts,
    amountText,
    setAmountText,
    showCalculator,
    calculatorExpression,
    setCalculatorExpression,
    openCalculator,
    closeCalculator,
    applyCalculatorResult,
    amountError,
    categoryId,
    setCategoryId,
    date,
    setDate,
    accountId,
    setAccountId,
    note,
    setNote,
    saveDisabled,
    saving,
    cancel,
    submit,
    reloadMeta,
    lockAccount,
  };
}

function normalizeAmountText(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function dedupeCategories(categories: ExpenseCategory[]) {
  const seen = new Set<number>();
  return categories.filter((category) => {
    if (seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  });
}
