import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import {
  addMonths,
  formatMonthLabel,
  isoDate,
  isoMonthAnchor,
  monthStart,
} from "../../../../utils/dates";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import {
  loadLentMoneyAccounts,
  loadPayableEntryCategories,
  savePayableEntry,
} from "../../../entry/service";
import type { ExpenseCategoryRow as ExpenseCategory } from "../../../../data/types";
import type { EntryAccountOption } from "../types";

type PayableDraft = {
  platform: string;
  monthIsoAnchor: string;
  dueDateIso: string | null;
  amountText: string;
  categoryId: number | null;
  preferredAccountId: number | null;
};

const DEFAULT_MONTH = isoMonthAnchor(monthStart(new Date()));

export function useAddPayableScreenController(params?: { defaultMonth?: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const initialMonthIso = params?.defaultMonth ?? DEFAULT_MONTH;
  const [platform, setPlatform] = useState("");
  const [monthIsoAnchor, setMonthIsoAnchor] = useState(initialMonthIso);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [amountText, setAmountText] = useState("");
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<EntryAccountOption[]>([]);
  const [preferredAccountId, setPreferredAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const initialDraftRef = useRef<PayableDraft>({
    platform: "",
    monthIsoAnchor: initialMonthIso,
    dueDateIso: null,
    amountText: "",
    categoryId: null,
    preferredAccountId: null,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoadingCategories(true);
        const nextCategories = await loadPayableEntryCategories();
        if (!active) return;
        setCategories(nextCategories);
      } catch {
        if (!active) return;
        setCategories([]);
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void loadLentMoneyAccounts()
      .then((rows) => {
        if (!active) return;
        setAccounts(rows ?? []);
      })
      .catch(() => {
        if (!active) return;
        setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const amountValidation = useMemo(() => {
    const parsed = parseNumber(amountText.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false as const, error: "Enter a positive amount." };
    }
    return { valid: true as const, value: parsed };
  }, [amountText]);

  const payeeError = platform.trim() ? null : "Payee/platform is required.";

  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const draft = useMemo<PayableDraft>(
    () => ({
      platform,
      monthIsoAnchor,
      dueDateIso: dueDate ? isoDate(dueDate) : null,
      amountText,
      categoryId,
      preferredAccountId,
    }),
    [amountText, categoryId, dueDate, monthIsoAnchor, platform, preferredAccountId]
  );

  const isDirty = useMemo(() => {
    const initial = initialDraftRef.current;
    return (
      initial.platform !== draft.platform ||
      initial.monthIsoAnchor !== draft.monthIsoAnchor ||
      initial.dueDateIso !== draft.dueDateIso ||
      initial.amountText !== draft.amountText ||
      initial.categoryId !== draft.categoryId ||
      initial.preferredAccountId !== draft.preferredAccountId
    );
  }, [draft]);

  const dueDateIso = dueDate ? isoDate(dueDate) : null;
  const dueDateError =
    dueDateIso && dueDateIso.slice(0, 7) !== monthIsoAnchor.slice(0, 7)
      ? "Due date must be within the selected month."
      : null;
  const saveDisabled =
    saving ||
    !amountValidation.valid ||
    !platform.trim() ||
    !monthIsoAnchor.trim() ||
    !!dueDateError;

  const cancel = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      navigation.goBack();
      return;
    }
    confirmDiscardChanges(() => navigation.goBack());
  }, [isDirty, navigation, saving]);

  const submit = useCallback(async () => {
    const trimmedPlatform = platform.trim();
    if (!trimmedPlatform) {
      Alert.alert("Payee required", "Enter a payee/platform name.");
      return;
    }
    if (!amountValidation.valid) {
      Alert.alert("Invalid amount", amountValidation.error);
      return;
    }
    if (!monthIsoAnchor.trim()) {
      Alert.alert("Month required", "Select a month.");
      return;
    }
    if (dueDateError) {
      Alert.alert("Invalid due date", dueDateError);
      return;
    }
    try {
      setSaving(true);
      const result = await savePayableEntry({
        platform: trimmedPlatform,
        monthIsoAnchor,
        dueDateIso,
        amount: amountValidation.value,
        categoryId: categoryId ?? null,
        preferredAccountId: preferredAccountId ?? null,
      });
      Alert.alert("Saved", result.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert(
        "Unable to add payable",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [
    amountValidation,
    categoryId,
    dueDateError,
    dueDateIso,
    monthIsoAnchor,
    navigation,
    platform,
    preferredAccountId,
  ]);

  const monthStartDate = new Date(monthIsoAnchor);
  const minDueDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), 1);
  const maxDueDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);

  return {
    platform,
    setPlatform,
    monthIsoAnchor,
    setMonthIsoAnchor,
    dueDate,
    setDueDate,
    dueDateError,
    minDueDate,
    maxDueDate,
    monthOptions,
    categories,
    loadingCategories,
    categoryId,
    setCategoryId,
    accounts,
    preferredAccountId,
    setPreferredAccountId,
    amountText,
    setAmountText,
    payeeError,
    amountError: amountValidation.valid ? null : amountValidation.error,
    saving,
    saveDisabled,
    cancel,
    submit,
  };
}

function buildMonthOptions() {
  const anchor = monthStart(new Date());
  const options: { label: string; value: string }[] = [];

  for (let offset = -12; offset <= 18; offset += 1) {
    const monthIsoAnchor = isoMonthAnchor(addMonths(anchor, offset));
    options.push({
      value: monthIsoAnchor,
      label: formatMonthLabel(monthIsoAnchor),
    });
  }

  return options;
}
