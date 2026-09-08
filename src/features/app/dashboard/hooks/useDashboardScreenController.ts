import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useNavigation, useNavigationState } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import { buildDefaultLedgerSheetActions, isEditableLedgerEntry } from "../../ledger/actionPolicy";
import { navigateToLinkedEntryEditor } from "../../ledger/linkedEntryNavigation";
import type { LedgerEntryActionTarget } from "../../ledger/types";
import type { RootStackParamList } from "../../../../navigation/types";
import { loadDashboardSnapshot } from "../../../../features/dashboard/service";
import { removeTransaction as archiveTransactionHistoryEntry } from "../../../../features/cashflow/service";
import type { DashboardRecentActivityItem, DashboardSnapshot } from "../types";

export function useDashboardScreenController() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [focusKey, setFocusKey] = useState(0);
  const [entryActionTarget, setEntryActionTarget] = useState<LedgerEntryActionTarget | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const loadingRef = useRef(false);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = await loadDashboardSnapshot();
      setSnapshot(next);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
      setFocusKey((prev) => prev + 1);
      return undefined;
    }, [reload])
  );

  // Reload when a transparent-modal entry screen is dismissed (stack shrinks).
  // useFocusEffect alone won't fire because the Dashboard never loses focus
  // when transparent modals are presented on top of it.
  const stackDepth = useNavigationState((state) => state.routes.length);
  const prevStackDepthRef = useRef(stackDepth);
  useEffect(() => {
    if (stackDepth < prevStackDepthRef.current) {
      void reload();
    }
    prevStackDepthRef.current = stackDepth;
  }, [stackDepth, reload]);
  useGlobalSwipeLock(!!entryActionTarget);

  const onPressOpenExpenses = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Expenses" });
  }, [navigation]);

  const onOpenTransactionHistory = useCallback(() => {
    navigation.navigate("TransactionHistory");
  }, [navigation]);

  const closeEntryActions = useCallback(() => {
    setEntryActionTarget(null);
  }, []);

  const onPressRecentActivityItem = useCallback((item: DashboardRecentActivityItem) => {
    setEntryActionTarget({
      activityKey: item.key,
      id: item.id,
      date: item.date,
      createdAt: item.createdAt,
      amount: item.amount,
      note: item.note,
      accountId: item.accountId,
      accountName: item.accountName,
      linkedExpenseId: item.linkedExpenseId,
      linkedReceivablePaymentId: item.linkedReceivablePaymentId,
      linkedPayablePaymentId: item.linkedPayablePaymentId,
      transferGroupId: item.transferGroupId,
      sourceKind: item.sourceKind,
    });
  }, []);

  const openEditFromActions = useCallback(
    async (entry: LedgerEntryActionTarget) => {
      closeEntryActions();
      if (!isEditableLedgerEntry(entry)) {
        const opened = await navigateToLinkedEntryEditor(navigation, entry);
        if (!opened) {
          Alert.alert("Unable to open linked transaction", "The linked entry could not be found.");
        }
        return;
      }
      navigation.navigate("TransactionHistory", {
        initialEntry: entry,
        initialMode: "edit",
      });
    },
    [closeEntryActions, navigation]
  );

  const archiveFromActions = useCallback(
    (entry: LedgerEntryActionTarget) => {
      Alert.alert("Archive transaction?", "This will remove the entry permanently.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              setArchivingId(entry.id);
              closeEntryActions();
              await archiveTransactionHistoryEntry(entry.id);
              await reload();
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
    [closeEntryActions, reload]
  );

  const entrySheetActions = useMemo(
    () =>
      buildDefaultLedgerSheetActions({
        entry: entryActionTarget,
        isArchiving: entryActionTarget != null && archivingId === entryActionTarget.id,
        onEdit: openEditFromActions,
        onArchive: archiveFromActions,
      }),
    [archivingId, archiveFromActions, entryActionTarget, openEditFromActions]
  );

  return {
    snapshot,
    loading,
    focusKey,
    reload,
    onPressOpenExpenses,
    onOpenTransactionHistory,
    entryActionTarget,
    closeEntryActions,
    entrySheetActions,
    onPressRecentActivityItem,
  };
}
