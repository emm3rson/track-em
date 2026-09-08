import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  useScrollToTop,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList, TabParamList } from "../../../../navigation/types";

import { saveExpense, removeExpense } from "../../../../features/expenses/service";
import type { AmountValidation, ExpenseEntry } from "../../../../features/expenses/types";
import { confirmDiscardChanges } from "../../../../utils/confirm";
import {
  addMonths,
  formatMonthLabel,
  isoDate,
  isoMonthAnchor,
  monthStart,
} from "../../../../utils/dates";
import { php } from "../../../../utils/currency";
import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import { parseNumber } from "../../../../utils/parseNumber";
import { evaluateAmountExpression } from "../../../../utils/amountExpression";
import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { DonutSegment } from "../../../../components/charts/DonutChart";
import { colorForExpenseCategory } from "../../../../features/expenses/chartPalette";
import { useTheme } from "../../../../theme/ThemeProvider";
import { loadExpenseEntryById, loadExpensesMonth } from "../../../../features/expenses/service";
import type { CategoryTotal, ExpenseAccount, ExpenseCategory } from "../types";
import { Trash, Pencil } from "lucide-react-native";

export function useExpensesScreenController() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabParamList, "Expenses">>();
  const scrollRef = useRef<ScrollView | null>(null);
  useScrollToTop(scrollRef);

  const onOpenTransactionHistory = useCallback(() => {
    navigation.navigate("TransactionHistory");
  }, [navigation]);

  const [monthAnchor, setMonthAnchor] = useState(() => isoMonthAnchor(monthStart(new Date())));
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [eligibleAccounts, setEligibleAccounts] = useState<ExpenseAccount[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadExpensesMonth(monthAnchor);
      setMonthTotal(data.total);
      setCategoryTotals(data.categoryTotals);
      setExpenses(data.expenses);
      setCategories(data.categories);
      setEligibleAccounts(data.eligibleAccounts);
    } finally {
      setLoading(false);
    }
  }, [monthAnchor]);

  const [categoryFilterId, setCategoryFilterId] = useState<number | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [expenseEntryActionTarget, setExpenseEntryActionTarget] = useState<ExpenseEntry | null>(
    null
  );
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("edit");
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [expenseAccountId, setExpenseAccountId] = useState<number | null>(null);
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const consumedLaunchKeyRef = useRef<string | null>(null);
  const editInitialRef = useRef<{
    amountText: string;
    note: string;
    dateIso: string;
    categoryId: number | null;
    accountId: number | null;
  } | null>(null);
  const swipeLocked = showModal || showDate || !!expenseEntryActionTarget;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        await load();
        if (active) {
          setInitialLoaded(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setCategoryFilterId(null);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setFocusKey((key) => key + 1);
    }, [])
  );

  useGlobalSwipeLock(swipeLocked);

  const onPrevMonth = useCallback(() => {
    setMonthAnchor((prev) => isoMonthAnchor(addMonths(new Date(prev), -1)));
    setFocusKey((key) => key + 1);
  }, []);

  const onNextMonth = useCallback(() => {
    setMonthAnchor((prev) => isoMonthAnchor(addMonths(new Date(prev), 1)));
    setFocusKey((key) => key + 1);
  }, []);

  const monthLabel = useMemo(() => formatMonthLabel(monthAnchor), [monthAnchor]);
  const expenseDonutSegments = useMemo<DonutSegment[]>(
    () =>
      categoryTotals.map((categoryTotal) => ({
        key: String(categoryTotal.categoryId),
        label: categoryTotal.name,
        value: categoryTotal.total ?? 0,
        color: colorForExpenseCategory(categoryTotal.categoryId, colors),
      })),
    [categoryTotals, colors]
  );
  const selectedCategoryTotal = useMemo(
    () =>
      categoryTotals.find((categoryTotal) => categoryTotal.categoryId === categoryFilterId) ?? null,
    [categoryFilterId, categoryTotals]
  );
  const donutCenterValueText = useMemo(
    () => php.format(selectedCategoryTotal?.total ?? monthTotal ?? 0),
    [monthTotal, selectedCategoryTotal?.total]
  );
  const donutCenterSubtitle = selectedCategoryTotal?.name ?? "Monthly Total";
  const donutSelectionShade = selectedCategoryTotal
    ? `${monthAnchor}:${selectedCategoryTotal.categoryId}:${selectedCategoryTotal.total ?? 0}`
    : null;

  useEffect(() => {
    if (categoryFilterId == null) return;
    if (categoryTotals.some((categoryTotal) => categoryTotal.categoryId === categoryFilterId)) {
      return;
    }
    setCategoryFilterId(null);
  }, [categoryFilterId, categoryTotals]);

  const emptyExpenses = expenses.length === 0;
  const filteredExpenses = useMemo(() => {
    if (!categoryFilterId) return expenses;
    return expenses.filter((expense) => expense.categoryId === categoryFilterId);
  }, [categoryFilterId, expenses]);

  const openEntryActions = useCallback((expense: ExpenseEntry) => {
    setExpenseEntryActionTarget(expense);
  }, []);

  const closeEntryActions = useCallback(() => {
    setExpenseEntryActionTarget(null);
  }, []);

  const openEditModal = useCallback(
    (expense: ExpenseEntry) => {
      closeEntryActions();
      setModalMode("edit");
      setEditingExpense(expense);
      setAmountText(String(expense.amount ?? 0));
      setNote(expense.note ?? "");
      setExpenseDate(new Date(expense.date));
      setCategoryId(expense.categoryId ?? null);
      setExpenseAccountId(expense.accountId ?? null);
      editInitialRef.current = {
        amountText: String(expense.amount ?? 0),
        note: expense.note ?? "",
        dateIso: expense.date,
        categoryId: expense.categoryId ?? null,
        accountId: expense.accountId ?? null,
      };
      setShowModal(true);
    },
    [closeEntryActions]
  );

  const launchAction = route.params?.launchAction;
  const launchExpenseId = route.params?.expenseId;
  const launchNonce = route.params?.launchNonce ?? 0;

  useEffect(() => {
    if (launchAction !== "editExpense" || typeof launchExpenseId !== "number") return;
    const consumeKey = `${launchAction}:${launchExpenseId}:${launchNonce}`;
    if (consumedLaunchKeyRef.current === consumeKey) return;
    consumedLaunchKeyRef.current = consumeKey;

    void (async () => {
      const linkedExpense = await loadExpenseEntryById(launchExpenseId);
      if (!linkedExpense) {
        Alert.alert("Unable to open linked transaction", "The linked expense could not be found.");
        return;
      }
      setCategoryFilterId(null);
      setMonthAnchor(isoMonthAnchor(new Date(linkedExpense.date)));
      openEditModal(linkedExpense);
    })();
  }, [launchAction, launchExpenseId, launchNonce, openEditModal]);

  const confirmArchiveExpense = useCallback(
    (expense: ExpenseEntry) => {
      Alert.alert("Archive expense?", "This will remove the entry permanently.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              setArchivingId(expense.id);
              closeEntryActions();
              await removeExpense(expense.id);
              await load();
            } catch (error) {
              Alert.alert(
                "Unable to archive",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setArchivingId(null);
            }
          },
        },
      ]);
    },
    [closeEntryActions, load]
  );

  const expenseEntrySheetActions = useMemo<ActionBottomSheetAction[]>(() => {
    const target = expenseEntryActionTarget;
    const noTarget = !target;
    const isArchiving = target != null && archivingId === target.id;
    return [
      {
        key: "edit",
        label: "Edit",
        Icon: Pencil,
        disabled: noTarget,
        onPress: () => {
          if (target) openEditModal(target);
        },
      },
      {
        key: "archive",
        label: isArchiving ? "Archiving..." : "Archive",
        tone: "danger",
        Icon: Trash,
        disabled: noTarget || isArchiving,
        onPress: () => {
          if (target) confirmArchiveExpense(target);
        },
      },
    ];
  }, [expenseEntryActionTarget, archivingId, openEditModal, confirmArchiveExpense]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalMode("edit");
    setEditingExpense(null);
    setExpenseAccountId(null);
    setShowDate(false);
    setSaving(false);
    editInitialRef.current = null;
  }, []);

  const isEditDirty =
    !!editInitialRef.current &&
    (amountText !== editInitialRef.current.amountText ||
      note !== editInitialRef.current.note ||
      isoDate(expenseDate) !== editInitialRef.current.dateIso ||
      categoryId !== editInitialRef.current.categoryId ||
      expenseAccountId !== editInitialRef.current.accountId);

  const amountValidation = useMemo<AmountValidation>(() => {
    const trimmed = amountText.trim();
    if (!trimmed) {
      return { valid: false, error: "Enter an amount." };
    }
    if (trimmed.startsWith("=")) {
      const evaluation = evaluateAmountExpression(trimmed);
      if (!evaluation.ok) {
        return { valid: false, error: evaluation.error };
      }
      if (evaluation.value <= 0) {
        return { valid: false, error: "Enter a valid amount greater than 0." };
      }
      return { valid: true, value: evaluation.value };
    }
    const amount = parseNumber(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { valid: false, error: "Enter a valid amount greater than 0." };
    }
    return { valid: true, value: amount };
  }, [amountText]);

  const amountError =
    !amountValidation.valid && amountValidation.error !== "Enter an amount."
      ? amountValidation.error
      : null;
  const saveDisabled = saving || !amountValidation.valid || !categoryId;

  const historicalSelectedAccount = useMemo(() => {
    if (expenseAccountId == null) return null;
    if (eligibleAccounts.some((account) => account.id === expenseAccountId)) return null;
    if (editingExpense?.accountId !== expenseAccountId) return null;
    return {
      id: expenseAccountId,
      name: editingExpense.accountName ?? `Account #${expenseAccountId}`,
    };
  }, [editingExpense, eligibleAccounts, expenseAccountId]);

  const getProjectedBalanceAfterSave = useCallback(
    (nextAmount: number) => {
      if (expenseAccountId == null) return null;
      const selectedAccount = eligibleAccounts.find((account) => account.id === expenseAccountId);
      if (!selectedAccount) return null;

      let projectedBalance = selectedAccount.balance ?? 0;
      if (modalMode === "edit" && editingExpense?.accountId === expenseAccountId) {
        projectedBalance += editingExpense.amount ?? 0;
      }
      projectedBalance -= nextAmount;
      return projectedBalance;
    },
    [editingExpense, eligibleAccounts, expenseAccountId, modalMode]
  );

  const attemptCloseModal = useCallback(() => {
    if (saving) return;
    if (!isEditDirty) {
      closeModal();
      return;
    }
    confirmDiscardChanges(closeModal);
  }, [closeModal, isEditDirty, saving]);

  const handleSaveExpense = useCallback(async () => {
    if (!amountValidation.valid) {
      Alert.alert("Invalid amount", amountValidation.error);
      return;
    }
    if (!categoryId) {
      Alert.alert("Select a category");
      return;
    }

    const persistSave = async () => {
      try {
        setSaving(true);
        const amount = amountValidation.value;
        await saveExpense({
          mode: modalMode,
          id: editingExpense?.id,
          dateIso: isoDate(expenseDate),
          amount,
          categoryId,
          accountId: expenseAccountId,
          note: note.trim() ? note.trim() : null,
        });
        closeModal();
        await load();
      } catch (error) {
        Alert.alert(
          "Unable to save expense",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSaving(false);
      }
    };

    const projectedBalance = getProjectedBalanceAfterSave(amountValidation.value);
    if (projectedBalance != null && projectedBalance < 0) {
      const selectedAccount = eligibleAccounts.find((account) => account.id === expenseAccountId);
      Alert.alert(
        "Low balance warning",
        `${
          selectedAccount?.name ?? "This account"
        } will become ${php.format(projectedBalance)} after this expense.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save anyway", style: "destructive", onPress: () => void persistSave() },
        ]
      );
      return;
    }

    await persistSave();
  }, [
    amountValidation,
    categoryId,
    modalMode,
    editingExpense?.id,
    expenseDate,
    expenseAccountId,
    note,
    eligibleAccounts,
    closeModal,
    load,
    getProjectedBalanceAfterSave,
  ]);

  const visibleCategories = useMemo(() => {
    const seen = new Set<number>();
    return categories.filter((category) => {
      if (seen.has(category.id)) return false;
      seen.add(category.id);
      return true;
    });
  }, [categories]);

  const showInitialLoading = !initialLoaded && expenses.length === 0;

  return {
    scrollRef,
    showInitialLoading,
    monthLabel,
    focusKey,
    categoryTotals,
    selectedCategoryTotal,
    donutSelectionShade,
    expenseDonutSegments,
    donutCenterValueText,
    donutCenterSubtitle,
    categoryFilterId,
    setCategoryFilterId,
    emptyExpenses,
    filteredExpenses,
    loading,
    expenseEntryActionTarget,
    openEntryActions,
    closeEntryActions,
    expenseEntrySheetActions,
    openEditModal,
    onPrevMonth,
    onNextMonth,
    showModal,
    modalMode,
    expenseDate,
    setExpenseDate,
    showDate,
    setShowDate,
    amountText,
    setAmountText,
    amountError,
    categoryId,
    setCategoryId,
    expenseAccountId,
    setExpenseAccountId,
    visibleCategories,
    eligibleAccounts,
    historicalSelectedAccount,
    note,
    setNote,
    saveDisabled,
    saving,
    attemptCloseModal,
    handleSaveExpense,
    showCategoriesModal,
    setShowCategoriesModal,
    load,
    onOpenTransactionHistory,
  };
}
