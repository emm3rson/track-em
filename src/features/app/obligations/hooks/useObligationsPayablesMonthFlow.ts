import { useCallback, useMemo, useState } from "react";
import { Alert, type ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MutableRefObject } from "react";

import type { RootStackParamList } from "../../../../navigation/types";
import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { CreditRow } from "../../../../features/payables/types";
import {
  archiveMonth as archivePayablesMonth,
  copyPayableToNextMonthReplace,
  deletePayablesMonth,
  duplicatePayableToNextMonth,
  restoreMonth as restorePayablesMonth,
} from "../../../../features/payables/service";
import { addMonths, formatMonthLabel, isoMonthAnchor } from "../../../../utils/dates";
import { logger } from "../../../../utils/logger";
import { Copy, CreditCard, Trash } from "lucide-react-native";

type UseObligationsPayablesMonthFlowParams = {
  load: () => Promise<void>;
  scrollRef: MutableRefObject<ScrollView | null>;
  months: string[];
  archivedMonths: string[];
  byMonth: Map<string, Map<string, CreditRow>>;
  autoArchivedSet: Set<string>;
  currentMonthAnchor: string;
  nextMonthAnchor: string;
};

export function buildDefaultCustomMonthInput() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
}

export function parseCustomMonthInput(value: string): string | null {
  const trimmed = value.trim();
  const monthText = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed.slice(0, 7) : trimmed;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthText)) return null;
  return `${monthText}-01`;
}

export function useObligationsPayablesMonthFlow({
  load,
  months,
  archivedMonths,
  byMonth,
  autoArchivedSet,
  currentMonthAnchor,
  nextMonthAnchor,
}: UseObligationsPayablesMonthFlowParams) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [showAddMonthModal, setShowAddMonthModal] = useState(false);
  const [customMonthInput, setCustomMonthInput] = useState(buildDefaultCustomMonthInput);
  const [monthActionsTarget, setMonthActionsTarget] = useState<string | null>(null);
  const [showArchives, setShowArchives] = useState(false);
  const [archivingMonth, setArchivingMonth] = useState<string | null>(null);
  const [restoringMonth, setRestoringMonth] = useState<string | null>(null);

  // addingMonth is unused logic retained for UI compat — always false
  const addingMonth = false;

  const addMonthAnchor = useCallback(
    async (targetMonthAnchor: string) => {
      setShowAddMonthModal(false);
      navigation.navigate("EntryAddPayable", { defaultMonth: targetMonthAnchor });
    },
    [navigation]
  );

  const openAddMonthModal = useCallback(() => {
    setCustomMonthInput(buildDefaultCustomMonthInput());
    setShowAddMonthModal(true);
  }, []);

  const onAddCurrentMonth = useCallback(async () => {
    await addMonthAnchor(currentMonthAnchor);
  }, [addMonthAnchor, currentMonthAnchor]);

  const onAddNextMonth = useCallback(async () => {
    await addMonthAnchor(nextMonthAnchor);
  }, [addMonthAnchor, nextMonthAnchor]);

  const onAddCustomMonth = useCallback(async () => {
    const anchor = parseCustomMonthInput(customMonthInput);
    if (!anchor) {
      Alert.alert("Invalid month", "Use YYYY-MM format, for example 2026-02.");
      return;
    }
    await addMonthAnchor(anchor);
  }, [addMonthAnchor, customMonthInput]);

  const onAddMonth = useCallback(async () => {
    openAddMonthModal();
  }, [openAddMonthModal]);

  const openMonthActionsSheet = useCallback(
    (month: string) => {
      if (months.length === 0) return;
      if (!months.includes(month)) return;
      setMonthActionsTarget(month);
    },
    [months]
  );

  const archiveMonthAction = useCallback(
    async (month: string) => {
      if (archivingMonth === month) return;
      try {
        setArchivingMonth(month);
        await archivePayablesMonth(month);
        await load();
      } catch (error) {
        logger.error("payables", "Archive month failed", error);
        Alert.alert("Failed to archive", "Please try again.");
      } finally {
        setArchivingMonth(null);
      }
    },
    [archivingMonth, load]
  );

  const restoreMonthAction = useCallback(
    async (month: string) => {
      if (autoArchivedSet.has(month)) return;
      if (restoringMonth === month) return;
      try {
        setRestoringMonth(month);
        await restorePayablesMonth(month);
        await load();
      } catch (error) {
        logger.error("payables", "Restore month failed", error);
        Alert.alert("Failed to restore", "Please try again.");
      } finally {
        setRestoringMonth(null);
      }
    },
    [autoArchivedSet, load, restoringMonth]
  );

  const handleDeleteArchivedMonth = useCallback(
    (month: string) => {
      Alert.alert(
        "Delete month permanently?",
        `This will permanently remove all unpaid payables scheduled for ${formatMonthLabel(month)}. This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deletePayablesMonth(month);
                await load();
              } catch (error) {
                logger.error("payables", "Delete archived month failed", error);
                Alert.alert("Failed to delete", "Please try again.");
              }
            },
          },
        ]
      );
    },
    [load]
  );

  const confirmArchiveMonth = useCallback(
    (month: string) => {
      Alert.alert(
        "Archive month?",
        `This will hide ${formatMonthLabel(month)} from the list. You can restore it anytime from Archives.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", style: "destructive", onPress: () => archiveMonthAction(month) },
        ]
      );
    },
    [archiveMonthAction]
  );

  const duplicateMonthToNextMonthFlow = useCallback(
    async (sourceMonth: string) => {
      const platformMap = byMonth.get(sourceMonth);
      if (!platformMap || platformMap.size === 0) return;
      const nextMonthIso = isoMonthAnchor(addMonths(new Date(sourceMonth), 1));
      const nextMonthMap = byMonth.get(nextMonthIso);
      const entries = Array.from(platformMap.entries());
      setMonthActionsTarget(null);
      try {
        for (const [platform, row] of entries) {
          const existing = nextMonthMap?.get(platform);
          const amount = row.amount ?? 0;
          const categoryId = row.categoryId ?? null;
          const preferredAccountId = row.preferredAccountId ?? null;
          if (existing) {
            const choice = await new Promise<"replace" | "discard" | "cancel">((resolve) => {
              Alert.alert(
                `${platform} already exists`,
                `${platform} already exists in ${formatMonthLabel(nextMonthIso)}. Replace or discard?`,
                [
                  { text: "Cancel", style: "cancel", onPress: () => resolve("cancel") },
                  { text: "Replace", onPress: () => resolve("replace") },
                  { text: "Discard", onPress: () => resolve("discard") },
                ]
              );
            });
            if (choice === "cancel") {
              await load();
              return;
            }
            if (choice === "discard") continue;
            await copyPayableToNextMonthReplace({
              platform,
              sourceMonthIso: sourceMonth,
              sourceDueDateIso: row.dueDate ?? null,
              amount,
              status: "UNPAID",
              categoryId: categoryId ?? null,
              preferredAccountId,
            });
          } else {
            await duplicatePayableToNextMonth({
              platform,
              monthIsoAnchor: sourceMonth,
              sourceDueDateIso: row.dueDate ?? null,
              amount,
              status: "UNPAID",
              categoryId: categoryId ?? null,
              preferredAccountId,
            });
          }
        }
        await load();
      } catch (error) {
        logger.error("payables", "Duplicate month failed", error);
        Alert.alert("Failed to duplicate month", "Please try again.");
      }
    },
    [byMonth, load]
  );

  const monthActionsSheetActions = useMemo<ActionBottomSheetAction[]>(() => {
    if (!monthActionsTarget) return [];
    const isArchivingMonth = archivingMonth === monthActionsTarget;
    return [
      {
        key: "add-payable",
        label: "Add Payable",
        Icon: CreditCard,
        onPress: () => {
          if (!monthActionsTarget) return;
          const defaultMonth = monthActionsTarget;
          setMonthActionsTarget(null);
          navigation.navigate("EntryAddPayable", { defaultMonth });
        },
      },
      {
        key: "archive-month",
        label: isArchivingMonth ? "Archiving..." : "Archive Month",
        tone: "danger",
        Icon: Trash,
        disabled: isArchivingMonth,
        onPress: () => {
          setMonthActionsTarget(null);
          confirmArchiveMonth(monthActionsTarget);
        },
      },
      {
        key: "duplicate-month",
        label: `Duplicate All ${monthActionsTarget ? formatMonthLabel(monthActionsTarget) : ""} Entries to Next Month`,
        Icon: Copy,
        disabled: isArchivingMonth,
        onPress: () => {
          if (!monthActionsTarget) return;
          const nextMonth = formatMonthLabel(
            isoMonthAnchor(addMonths(new Date(monthActionsTarget), 1))
          );
          Alert.alert(
            "Duplicate to next month?",
            `Copy all entries from ${formatMonthLabel(monthActionsTarget)} to ${nextMonth}.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Duplicate",
                onPress: () => {
                  setMonthActionsTarget(null);
                  void duplicateMonthToNextMonthFlow(monthActionsTarget);
                },
              },
            ]
          );
        },
      },
    ];
  }, [
    archivingMonth,
    confirmArchiveMonth,
    duplicateMonthToNextMonthFlow,
    monthActionsTarget,
    navigation,
  ]);

  const isRestoringNextMonth = addingMonth && archivedMonths.includes(nextMonthAnchor);

  return {
    addingMonth,
    onAddMonth,
    showAddMonthModal,
    setShowAddMonthModal,
    onAddCurrentMonth,
    onAddNextMonth,
    onAddCustomMonth,
    customMonthInput,
    setCustomMonthInput,
    isRestoringNextMonth,
    openMonthActionsSheet,
    monthActionsTarget,
    setMonthActionsTarget,
    monthActionsSheetActions,
    showArchives,
    setShowArchives,
    restoringMonth,
    restoreMonthAction,
    handleDeleteArchivedMonth,
    archivingMonth,
    confirmArchiveMonth,
  };
}
