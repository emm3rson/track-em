import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ArrowRightLeft,
  Banknote,
  BanknoteArrowDown,
  BanknoteArrowUp,
  ShoppingBag,
  Wallet,
} from "lucide-react-native";

import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { parseNumber } from "../../../../utils/parseNumber";
import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import type { RootStackParamList } from "../../../../navigation/types";
import { useTheme } from "../../../../theme/ThemeProvider";
import { buildDefaultLedgerSheetActions, isEditableLedgerEntry } from "../../ledger/actionPolicy";
import { navigateToLinkedEntryEditor } from "../../ledger/linkedEntryNavigation";

import {
  loadAccountLedgerRows,
  loadAccounts as loadAccountSummaries,
} from "../../../../features/accounts/service";
import {
  editTransaction as editLedgerTransaction,
  removeTransaction as removeLedgerTransaction,
} from "../../../../features/cashflow/service";
import type { AccountLedgerRow } from "../types";
import type { AccountType } from "../../../../data/types";
import type { AccountRow } from "../../../../features/accounts/types";

type UseAccountLedgerScreenControllerParams = {
  accountId: number;
  accountName: string;
  accountType: AccountType;
};

export function useAccountLedgerScreenController({
  accountId,
  accountName,
  accountType,
}: UseAccountLedgerScreenControllerParams) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [rows, setRows] = useState<AccountLedgerRow[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [entryActionTarget, setEntryActionTarget] = useState<AccountLedgerRow | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AccountLedgerRow | null>(null);
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [editDirection, setEditDirection] = useState<"outflow" | "inflow">("outflow");
  const [editAmountText, setEditAmountText] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDate, setShowEditDate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAddTransactionSheet, setShowAddTransactionSheet] = useState(false);
  const editInitialRef = useRef<{
    direction: "outflow" | "inflow";
    amountText: string;
    note: string;
    dateIso: string;
    accountId: number;
  } | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const PAGE_SIZE = 40;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRows, summaries] = await Promise.all([
        loadAccountLedgerRows(accountId, PAGE_SIZE, 0),
        loadAccountSummaries(),
      ]);
      setRows(nextRows);
      setHasMore(nextRows.length >= PAGE_SIZE);
      setAccountOptions(summaries);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextRows = await loadAccountLedgerRows(accountId, PAGE_SIZE, rows.length);
      setRows((prev) => [...prev, ...nextRows]);
      setHasMore(nextRows.length >= PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [accountId, hasMore, loading, loadingMore, rows.length]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const swipeLocked = !!entryActionTarget || !!editing || showEditDate || showAddTransactionSheet;
  useGlobalSwipeLock(swipeLocked);

  const scopedAccount = useMemo(() => ({ accountId, accountName }), [accountId, accountName]);

  const openEntryActions = useCallback((entry: AccountLedgerRow) => {
    setEntryActionTarget(entry);
  }, []);

  const closeEntryActions = useCallback(() => {
    setEntryActionTarget(null);
  }, []);

  const openAddTransactionSheet = useCallback(() => {
    setShowAddTransactionSheet(true);
  }, []);

  const closeAddTransactionSheet = useCallback(() => {
    setShowAddTransactionSheet(false);
  }, []);

  const navigateToEntryLogExpense = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryLogExpense", { scopedAccount });
  }, [navigation, scopedAccount]);

  const navigateToEntryLogIncome = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryLogIncome", { scopedAccount });
  }, [navigation, scopedAccount]);

  const navigateToEntryTransferFrom = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryTransferFunds", { scopedAccount, lockedDirection: "from" });
  }, [navigation, scopedAccount]);

  const navigateToEntryTransferTo = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryTransferFunds", { scopedAccount, lockedDirection: "to" });
  }, [navigation, scopedAccount]);

  const navigateToEntryAddPayablePayment = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryAddPayablePayment", { scopedAccount });
  }, [navigation, scopedAccount]);

  const navigateToEntryAddReceivablePayment = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryAddReceivablePayment", { scopedAccount });
  }, [navigation, scopedAccount]);

  const navigateToEntryLogLentMoney = useCallback(() => {
    setShowAddTransactionSheet(false);
    navigation.navigate("EntryLogLentMoney", { scopedAccount });
  }, [navigation, scopedAccount]);

  const canLogIncome = accountType === "SOURCE";

  const addTransactionActions = useMemo<ActionBottomSheetAction[]>(
    () => [
      {
        key: "add-expense",
        label: "Expense",
        tone: "danger",
        Icon: ShoppingBag,
        iconTintColor: colors.badges.unpaid.text,
        onPress: navigateToEntryLogExpense,
      },
      {
        key: "add-income",
        label: "Income",
        tone: "success",
        Icon: Wallet,
        iconTintColor: colors.badges.settled.text,
        disabled: !canLogIncome,
        onPress: navigateToEntryLogIncome,
      },
      {
        key: "transfer-from",
        label: "Transfer From",
        Icon: ArrowRightLeft,
        iconTintColor: colors.badges.partial.text,
        onPress: navigateToEntryTransferFrom,
      },
      {
        key: "transfer-to",
        label: "Transfer To",
        Icon: ArrowRightLeft,
        iconTintColor: colors.badges.partial.text,
        onPress: navigateToEntryTransferTo,
      },
      {
        key: "add-payable-payment",
        label: "Payable Payment",
        Icon: BanknoteArrowDown,
        iconTintColor: colors.badges.unpaid.text,
        onPress: navigateToEntryAddPayablePayment,
      },
      {
        key: "add-receivable-payment",
        label: "Receivable Payment",
        Icon: BanknoteArrowUp,
        iconTintColor: colors.badges.settled.text,
        onPress: navigateToEntryAddReceivablePayment,
      },
      {
        key: "lent-money",
        label: "Lent Money",
        Icon: Banknote,
        iconTintColor: colors.badges.partial.text,
        onPress: navigateToEntryLogLentMoney,
      },
    ],
    [
      canLogIncome,
      colors.badges.partial.text,
      colors.badges.settled.text,
      colors.badges.unpaid.text,
      navigateToEntryAddPayablePayment,
      navigateToEntryAddReceivablePayment,
      navigateToEntryLogExpense,
      navigateToEntryLogIncome,
      navigateToEntryLogLentMoney,
      navigateToEntryTransferFrom,
      navigateToEntryTransferTo,
    ]
  );

  const openEdit = useCallback(
    async (tx: AccountLedgerRow) => {
      closeEntryActions();
      if (!isEditableLedgerEntry(tx)) {
        const opened = await navigateToLinkedEntryEditor(navigation, tx);
        if (!opened) {
          Alert.alert("Unable to open linked transaction", "The linked entry could not be found.");
        }
        return;
      }

      const direction = tx.amount < 0 ? "outflow" : "inflow";
      setEditing(tx);
      setEditAccountId(tx.accountId);
      setEditDirection(direction);
      setEditAmountText(String(Math.abs(tx.amount)));
      setEditNote(tx.note ?? "");
      setEditDate(new Date(tx.date));
      editInitialRef.current = {
        direction,
        amountText: String(Math.abs(tx.amount)),
        note: tx.note ?? "",
        dateIso: tx.date,
        accountId: tx.accountId,
      };
    },
    [closeEntryActions, navigation]
  );

  const closeEdit = useCallback(() => {
    setEditing(null);
    setEditAccountId(null);
    setEditDirection("outflow");
    setEditAmountText("");
    setEditNote("");
    setEditDate(new Date());
    setShowEditDate(false);
    setSavingEdit(false);
    editInitialRef.current = null;
  }, []);

  const onSaveEdit = useCallback(async () => {
    if (!editing) return;
    const amt = parseNumber(editAmountText);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert("Enter a valid amount (greater than zero)");
      return;
    }
    const finalAmount = editDirection === "outflow" ? -Math.abs(amt) : Math.abs(amt);

    try {
      setSavingEdit(true);
      await editLedgerTransaction({
        id: editing.id,
        accountId: editAccountId ?? undefined,
        dateIso: isoDate(editDate),
        amount: finalAmount,
        note: editNote.trim() ? editNote.trim() : undefined,
      });
      closeEdit();
      await load();
    } catch (error) {
      Alert.alert("Unable to edit", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }, [editing, editAccountId, editAmountText, editDate, editDirection, editNote, closeEdit, load]);

  const archiveEntry = useCallback(
    async (entry: AccountLedgerRow) => {
      if (!isEditableLedgerEntry(entry) && entry.transferGroupId == null) {
        return;
      }
      const isTransfer = entry.transferGroupId != null;
      const title = isTransfer ? "Delete transfer?" : "Archive transaction?";
      const message = isTransfer
        ? "This will delete both transfer legs and any linked fee permanently."
        : "This will remove the entry permanently.";
      const buttonLabel = isTransfer ? "Delete" : "Archive";

      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        {
          text: buttonLabel,
          style: "destructive",
          onPress: async () => {
            try {
              setArchivingId(entry.id);
              closeEntryActions();
              await removeLedgerTransaction(entry.id);
              await load();
            } catch (error) {
              Alert.alert(
                "Unable to delete",
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

  const entrySheetActions = useMemo(
    () =>
      buildDefaultLedgerSheetActions({
        entry: entryActionTarget,
        isArchiving: entryActionTarget != null && archivingId === entryActionTarget.id,
        onEdit: openEdit,
        onArchive: (entry) => {
          void archiveEntry(entry);
        },
      }),
    [archiveEntry, archivingId, entryActionTarget, openEdit]
  );

  const isEditDirty =
    !!editing &&
    !!editInitialRef.current &&
    (editAccountId !== editInitialRef.current.accountId ||
      editDirection !== editInitialRef.current.direction ||
      editAmountText !== editInitialRef.current.amountText ||
      editNote !== editInitialRef.current.note ||
      isoDate(editDate) !== editInitialRef.current.dateIso);

  const attemptCloseEdit = useCallback(() => {
    if (savingEdit) return;
    if (!isEditDirty) {
      closeEdit();
      return;
    }
    confirmDiscardChanges(closeEdit);
  }, [savingEdit, isEditDirty, closeEdit]);

  return {
    rows,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    load,
    scrollRef,
    entryActionTarget,
    openEntryActions,
    closeEntryActions,
    showAddTransactionSheet,
    openAddTransactionSheet,
    closeAddTransactionSheet,
    addTransactionActions,
    entrySheetActions,
    editing,
    accountOptions,
    editAccountId,
    setEditAccountId,
    editDirection,
    setEditDirection,
    editAmountText,
    setEditAmountText,
    editNote,
    setEditNote,
    editDate,
    setEditDate,
    showEditDate,
    setShowEditDate,
    savingEdit,
    attemptCloseEdit,
    onSaveEdit,
  };
}
