import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { confirmDiscardChanges } from "../../../../utils/confirm";
import { isoDate } from "../../../../utils/dates";
import { parseNumber } from "../../../../utils/parseNumber";
import type { RootStackParamList } from "../../../../navigation/types";
import { buildDefaultLedgerSheetActions, isEditableLedgerEntry } from "../../ledger/actionPolicy";
import { navigateToLinkedEntryEditor } from "../../ledger/linkedEntryNavigation";
import type { LedgerEntryActionTarget } from "../../ledger/types";
import {
  editTransaction as editTransactionHistoryEntry,
  removeTransaction as archiveTransactionHistoryEntry,
} from "../../../../features/cashflow/service";

export type UseTransactionHistoryEntryActionsParams = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  initialRouteEntry: LedgerEntryActionTarget | undefined;
  initialRouteMode: "actions" | "edit";
  rowsRef: React.MutableRefObject<LedgerEntryActionTarget[]>;
  refreshRows: () => Promise<void>;
};

export function useTransactionHistoryEntryActions({
  navigation,
  initialRouteEntry,
  initialRouteMode,
  rowsRef,
  refreshRows,
}: UseTransactionHistoryEntryActionsParams) {
  const [entryActionTarget, setEntryActionTarget] = useState<LedgerEntryActionTarget | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const [editingEntry, setEditingEntry] = useState<LedgerEntryActionTarget | null>(null);
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [editDirection, setEditDirection] = useState<"outflow" | "inflow">("outflow");
  const [editAmountText, setEditAmountText] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState(new Date());
  const [showEditDate, setShowEditDate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const editInitialRef = useRef<{
    direction: "outflow" | "inflow";
    amountText: string;
    note: string;
    dateIso: string;
    accountId: number;
  } | null>(null);
  const consumedInitialEntryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialRouteEntry) {
      consumedInitialEntryKeyRef.current = null;
      return;
    }
    const consumeKey = `${initialRouteEntry.activityKey}:${initialRouteMode}`;
    if (consumedInitialEntryKeyRef.current === consumeKey) return;

    const matchingRow =
      rowsRef.current.find((row) => row.activityKey === initialRouteEntry.activityKey) ??
      initialRouteEntry;
    if (initialRouteMode === "edit" && isEditableLedgerEntry(matchingRow)) {
      const direction = matchingRow.amount < 0 ? "outflow" : "inflow";
      setEntryActionTarget(null);
      setEditingEntry(matchingRow);
      setEditAccountId(matchingRow.accountId);
      setEditDirection(direction);
      setEditAmountText(String(Math.abs(matchingRow.amount)));
      setEditNote(matchingRow.note ?? "");
      setEditDate(new Date(matchingRow.date));
      editInitialRef.current = {
        direction,
        amountText: String(Math.abs(matchingRow.amount)),
        note: matchingRow.note ?? "",
        dateIso: matchingRow.date,
        accountId: matchingRow.accountId,
      };
    } else {
      setEntryActionTarget(matchingRow);
    }
    consumedInitialEntryKeyRef.current = consumeKey;
    navigation.setParams({ initialEntry: undefined, initialMode: undefined });
  }, [initialRouteEntry, initialRouteMode, navigation, rowsRef]);

  const openEntryActions = useCallback((entry: LedgerEntryActionTarget) => {
    setEntryActionTarget(entry);
  }, []);

  const closeEntryActions = useCallback(() => {
    setEntryActionTarget(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingEntry(null);
    setEditAccountId(null);
    setEditDirection("outflow");
    setEditAmountText("");
    setEditNote("");
    setEditDate(new Date());
    setShowEditDate(false);
    setSavingEdit(false);
    editInitialRef.current = null;
  }, []);

  const openEditModal = useCallback(
    async (entry: LedgerEntryActionTarget) => {
      closeEntryActions();
      if (!isEditableLedgerEntry(entry)) {
        const opened = await navigateToLinkedEntryEditor(navigation, entry);
        if (!opened) {
          Alert.alert("Unable to open linked transaction", "The linked entry could not be found.");
        }
        return;
      }

      const direction = entry.amount < 0 ? "outflow" : "inflow";
      setEditingEntry(entry);
      setEditAccountId(entry.accountId);
      setEditDirection(direction);
      setEditAmountText(String(Math.abs(entry.amount)));
      setEditNote(entry.note ?? "");
      setEditDate(new Date(entry.date));
      editInitialRef.current = {
        direction,
        amountText: String(Math.abs(entry.amount)),
        note: entry.note ?? "",
        dateIso: entry.date,
        accountId: entry.accountId,
      };
    },
    [closeEntryActions, navigation]
  );

  const isEditDirty =
    !!editingEntry &&
    !!editInitialRef.current &&
    (editAccountId !== editInitialRef.current.accountId ||
      editDirection !== editInitialRef.current.direction ||
      editAmountText !== editInitialRef.current.amountText ||
      editNote !== editInitialRef.current.note ||
      isoDate(editDate) !== editInitialRef.current.dateIso);

  const attemptCloseEditModal = useCallback(() => {
    if (savingEdit) return;
    if (!isEditDirty) {
      closeEditModal();
      return;
    }
    confirmDiscardChanges(closeEditModal);
  }, [closeEditModal, isEditDirty, savingEdit]);

  const saveEdit = useCallback(async () => {
    if (!editingEntry) return;
    const parsedAmount = parseNumber(editAmountText);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid positive amount.");
      return;
    }
    const amount = editDirection === "outflow" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    try {
      setSavingEdit(true);
      await editTransactionHistoryEntry({
        id: editingEntry.id,
        accountId: editAccountId ?? undefined,
        dateIso: isoDate(editDate),
        amount,
        note: editNote.trim() ? editNote.trim() : undefined,
      });
      closeEditModal();
      await refreshRows();
    } catch (error) {
      Alert.alert("Unable to edit", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }, [
    closeEditModal,
    editAccountId,
    editAmountText,
    editDate,
    editDirection,
    editNote,
    editingEntry,
    refreshRows,
  ]);

  const archiveEntry = useCallback(
    async (entry: LedgerEntryActionTarget) => {
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
              await archiveTransactionHistoryEntry(entry.id);
              await refreshRows();
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
    [closeEntryActions, refreshRows]
  );

  const entrySheetActions = useMemo(
    () =>
      buildDefaultLedgerSheetActions({
        entry: entryActionTarget,
        isArchiving: entryActionTarget != null && archivingId === entryActionTarget.id,
        onEdit: openEditModal,
        onArchive: (entry) => {
          void archiveEntry(entry);
        },
      }),
    [archiveEntry, archivingId, entryActionTarget, openEditModal]
  );

  return {
    entryActionTarget,
    openEntryActions,
    closeEntryActions,
    entrySheetActions,
    editingEntry,
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
    attemptCloseEditModal,
    saveEdit,
  };
}
