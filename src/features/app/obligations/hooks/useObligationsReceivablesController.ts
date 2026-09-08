import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Alert, ToastAndroid } from "react-native";

import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { PaymentRow, ReceivablePaymentAccountRow, ReceivableRow } from "../types";
import type { ReceivableModalSave } from "../../../../features/receivables/components/ReceivableModal";
import {
  recordReceivablePayment,
  archiveReceivable,
  deletePayment,
  deleteReceivableCompletely,
  loadArchivedReceivablesPage,
  loadPayments,
  loadReceivableById,
  loadReceivablePaymentAccounts,
  restoreReceivable,
  saveReceivable,
  setReceivableIncludeInTotal,
  updatePayment,
} from "../../../../features/receivables/service";
import { logger } from "../../../../utils/logger";
import { BanknoteArrowUp, Pencil, CloudAlert, Trash } from "lucide-react-native";

type UseObligationsReceivablesControllerParams = {
  load: () => Promise<void>;
  receivablesRows: ReceivableRow[];
  setSavingPayment: Dispatch<SetStateAction<boolean>>;
};

export function useObligationsReceivablesController({
  load,
  receivablesRows,
  setSavingPayment,
}: UseObligationsReceivablesControllerParams) {
  const [receivablesSelectedEntry, setReceivablesSelectedEntry] = useState<ReceivableRow | null>(
    null
  );
  const [receivablesShowModal, setReceivablesShowModal] = useState(false);
  const [receivablesModalMode, setReceivablesModalMode] = useState<"add" | "edit">("edit");
  const [receivablesSaving, setReceivablesSaving] = useState(false);
  const [receivablesEntryActionTarget, setReceivablesEntryActionTarget] =
    useState<ReceivableRow | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentEntry, setPaymentEntry] = useState<ReceivableRow | null>(null);
  const [receivablesPaymentAccounts, setReceivablesPaymentAccounts] = useState<
    ReceivablePaymentAccountRow[]
  >([]);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null);
  const [showArchivedReceivables, setShowArchivedReceivables] = useState(false);
  const [archivedPageRows, setArchivedPageRows] = useState<ReceivableRow[]>([]);
  const [loadingArchivedInitial, setLoadingArchivedInitial] = useState(false);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [togglingIncludeEntryId, setTogglingIncludeEntryId] = useState<number | null>(null);
  const [loadingReceivablesPaymentAccounts, setLoadingReceivablesPaymentAccounts] = useState(false);

  const isSwipeLocked =
    receivablesShowModal ||
    !!receivablesEntryActionTarget ||
    showAddPaymentModal ||
    showPaymentHistoryModal ||
    showArchivedReceivables;

  const receivablesModalInitialValues = useMemo(() => {
    if (!receivablesSelectedEntry) return undefined;
    return {
      person: receivablesSelectedEntry.person,
      amount: receivablesSelectedEntry.amount,
      date: receivablesSelectedEntry.date,
      note: receivablesSelectedEntry.note,
      targetPaymentDate: receivablesSelectedEntry.targetPaymentDate,
    };
  }, [receivablesSelectedEntry]);

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  useEffect(() => {
    if (!receivablesSelectedEntry) return;
    const updated = receivablesRows.find((row) => row.id === receivablesSelectedEntry.id);
    if (updated && updated !== receivablesSelectedEntry) {
      setReceivablesSelectedEntry(updated);
    }
  }, [receivablesRows, receivablesSelectedEntry]);

  useEffect(() => {
    if (!paymentEntry) return;
    const updated = receivablesRows.find((row) => row.id === paymentEntry.id);
    if (updated && updated !== paymentEntry) {
      setPaymentEntry(updated);
    }
  }, [paymentEntry, receivablesRows]);

  useEffect(() => {
    if (!receivablesEntryActionTarget) return;
    const updated = receivablesRows.find((row) => row.id === receivablesEntryActionTarget.id);
    if (updated && updated !== receivablesEntryActionTarget) {
      setReceivablesEntryActionTarget(updated);
    }
  }, [receivablesEntryActionTarget, receivablesRows]);

  const openReceivablesEdit = useCallback((entry: ReceivableRow) => {
    setReceivablesSelectedEntry(entry);
    setReceivablesModalMode("edit");
    setReceivablesShowModal(true);
  }, []);

  const openReceivablesEditById = useCallback(
    async (receivableId: number) => {
      let target = receivablesRows.find((row) => row.id === receivableId);
      if (!target) {
        target = (await loadReceivableById(receivableId)) ?? undefined;
      }
      if (!target) return false;
      openReceivablesEdit(target);
      return true;
    },
    [openReceivablesEdit, receivablesRows]
  );

  const closeReceivablesModal = useCallback(() => {
    setReceivablesShowModal(false);
    setReceivablesSelectedEntry(null);
    setReceivablesModalMode("edit");
  }, []);

  const openReceivablesEntryActions = useCallback((entry: ReceivableRow) => {
    setReceivablesEntryActionTarget(entry);
  }, []);

  const closeReceivablesEntryActions = useCallback(() => {
    setReceivablesEntryActionTarget(null);
  }, []);

  const openAddReceivablePaymentModal = useCallback((entry: ReceivableRow) => {
    setPaymentEntry(entry);
    setShowAddPaymentModal(true);
  }, []);

  const openAddReceivablePayment = useCallback(
    (entry: ReceivableRow) => {
      openAddReceivablePaymentModal(entry);
    },
    [openAddReceivablePaymentModal]
  );

  const openReceivablePaymentEditById = useCallback(
    async (receivableId: number, paymentId: number) => {
      let targetEntry = receivablesRows.find((row) => row.id === receivableId);
      if (!targetEntry) {
        targetEntry = (await loadReceivableById(receivableId)) ?? undefined;
      }
      if (!targetEntry) return false;

      setPaymentEntry(targetEntry);
      setShowPaymentHistoryModal(true);
      const payments = await loadPayments(receivableId);
      setPaymentHistory(payments ?? []);

      const payment = (payments ?? []).find((row) => row.id === paymentId) ?? null;
      if (!payment) return false;
      setEditingPayment(payment);
      return true;
    },
    [receivablesRows]
  );

  const openPaymentHistoryModal = useCallback((entry: ReceivableRow) => {
    setPaymentEntry(entry);
    setShowPaymentHistoryModal(true);
  }, []);

  const closeAddReceivablePaymentModal = useCallback(() => {
    setShowAddPaymentModal(false);
    setPaymentEntry(null);
    setReceivablesPaymentAccounts([]);
  }, []);

  const closePaymentHistoryModal = useCallback(() => {
    setShowPaymentHistoryModal(false);
    setPaymentEntry(null);
    setEditingPayment(null);
  }, []);

  const closeArchivedReceivablesModal = useCallback(() => {
    setShowArchivedReceivables(false);
    setArchivedPageRows([]);
    setLoadingArchivedInitial(false);
  }, []);

  const loadArchivedPage = useCallback(async () => {
    if (loadingArchivedInitial) return;
    try {
      setLoadingArchivedInitial(true);
      const result = await loadArchivedReceivablesPage({ limit: 500, offset: 0 });
      setArchivedPageRows(result.rows);
    } catch (error) {
      logger.error("receivables", "Load archived receivables failed", error);
      Alert.alert("Failed to load archives", "Please try again.");
    } finally {
      setLoadingArchivedInitial(false);
    }
  }, [loadingArchivedInitial]);

  const openArchivedReceivablesModal = useCallback(async () => {
    await loadArchivedPage();
    setShowArchivedReceivables(true);
  }, [loadArchivedPage]);

  const closeEditPaymentModal = useCallback(() => {
    setEditingPayment(null);
  }, []);

  const loadReceivablesPaymentAccounts = useCallback(async () => {
    try {
      setLoadingReceivablesPaymentAccounts(true);
      const rows = await loadReceivablePaymentAccounts();
      setReceivablesPaymentAccounts(rows ?? []);
    } catch (error) {
      logger.error("receivables", "Load receivable payment accounts failed", error);
      Alert.alert("Unable to load accounts", "Please try again.");
      setReceivablesPaymentAccounts([]);
    } finally {
      setLoadingReceivablesPaymentAccounts(false);
    }
  }, []);

  const loadPaymentsForEntry = useCallback(async (receivableId: number | null) => {
    if (!receivableId) {
      setPaymentHistory([]);
      return;
    }
    try {
      setLoadingPayments(true);
      const result = await loadPayments(receivableId);
      setPaymentHistory(result ?? []);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    if (!showPaymentHistoryModal || !paymentEntry) {
      setPaymentHistory([]);
      return;
    }
    void loadPaymentsForEntry(paymentEntry.id);
  }, [loadPaymentsForEntry, paymentEntry, showPaymentHistoryModal]);

  useEffect(() => {
    if (!showAddPaymentModal || !paymentEntry) {
      setReceivablesPaymentAccounts([]);
      setLoadingReceivablesPaymentAccounts(false);
      return;
    }
    void loadReceivablesPaymentAccounts();
  }, [loadReceivablesPaymentAccounts, paymentEntry, showAddPaymentModal]);

  const handleReceivableModalSave = useCallback(
    async (values: ReceivableModalSave) => {
      if (!receivablesSelectedEntry) return;
      try {
        setReceivablesSaving(true);
        await saveReceivable({
          mode: "edit",
          selectedEntry: receivablesSelectedEntry,
          values: {
            person: values.person,
            amount: values.amount,
            dateIso: values.dateIso,
            note: values.note ?? null,
            targetPaymentDate: values.targetPaymentDate,
          },
        });
        await load();
        closeReceivablesModal();
      } catch (error) {
        logger.error("receivables", "Save receivable failed", error);
        Alert.alert("Failed to save", "Please try again.");
      } finally {
        setReceivablesSaving(false);
      }
    },
    [closeReceivablesModal, load, receivablesSelectedEntry]
  );

  const handleRecordReceivablePayment = useCallback(
    async (
      amount: number,
      note?: string,
      accountId?: number | null,
      entryOverride?: ReceivableRow | null
    ) => {
      const targetEntry = entryOverride ?? paymentEntry;
      if (!targetEntry) return;
      try {
        setSavingPayment(true);
        await recordReceivablePayment({
          entry: targetEntry,
          amount,
          note,
          accountId,
        });
        await load();
        closeAddReceivablePaymentModal();
      } catch (error) {
        logger.error("receivables", "Record payment failed", error);
        Alert.alert(
          "Failed to record payment",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSavingPayment(false);
      }
    },
    [closeAddReceivablePaymentModal, load, paymentEntry, setSavingPayment]
  );

  const handleUpdatePayment = useCallback(
    async (payment: PaymentRow, amount: number, note?: string) => {
      if (!paymentEntry) return;
      try {
        setSavingPayment(true);
        await updatePayment({
          entry: paymentEntry,
          paymentId: payment.id,
          amount,
          note,
        });
        await load();
        await loadPaymentsForEntry(paymentEntry.id);
        setEditingPayment(null);
      } catch (error) {
        logger.error("receivables", "Update payment failed", error);
        Alert.alert(
          "Failed to update payment",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSavingPayment(false);
      }
    },
    [load, loadPaymentsForEntry, paymentEntry, setSavingPayment]
  );

  const confirmDeletePayment = useCallback(
    (payment: PaymentRow) => {
      Alert.alert("Delete payment?", "This will remove the payment history entry.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!paymentEntry) return;
            try {
              setSavingPayment(true);
              await deletePayment({ entry: paymentEntry, paymentId: payment.id });
              await load();
              await loadPaymentsForEntry(paymentEntry.id);
              if (editingPayment?.id === payment.id) {
                setEditingPayment(null);
              }
            } catch (error) {
              logger.error("receivables", "Delete payment failed", error);
              Alert.alert(
                "Failed to delete payment",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setSavingPayment(false);
            }
          },
        },
      ]);
    },
    [editingPayment?.id, load, loadPaymentsForEntry, paymentEntry, setSavingPayment]
  );

  const archiveReceivableEntry = useCallback(
    async (entry: ReceivableRow) => {
      if (archivingId === entry.id) return;
      try {
        setArchivingId(entry.id);
        await archiveReceivable(entry.id);
        await load();
        closeReceivablesModal();
      } catch (error) {
        logger.error("receivables", "Archive receivable failed", error);
        Alert.alert("Failed to archive", "Please try again.");
      } finally {
        setArchivingId(null);
      }
    },
    [archivingId, closeReceivablesModal, load]
  );

  const confirmArchiveReceivable = useCallback(
    (entry: ReceivableRow) => {
      Alert.alert(
        "Archive receivable?",
        "This will hide the receivable from the list. You can restore it anytime from Archives.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", style: "destructive", onPress: () => archiveReceivableEntry(entry) },
        ]
      );
    },
    [archiveReceivableEntry]
  );

  const handleRestoreArchivedReceivable = useCallback(
    (entry: ReceivableRow) => {
      if (entry.settled === 1) {
        Alert.alert(
          "Cannot restore",
          "This receivable is fully settled. It will be re-archived automatically. Delete it if you no longer need it."
        );
        return;
      }

      Alert.alert("Restore receivable?", "This will move the receivable back to the active list.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              await restoreReceivable(entry.id);
              await loadArchivedPage();
              await load();
              ToastAndroid.show("Receivable restored successfully.", ToastAndroid.SHORT);
            } catch (error) {
              logger.error("receivables", "Restore receivable failed", error);
              Alert.alert(
                "Failed to restore",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
        },
      ]);
    },
    [load, loadArchivedPage]
  );

  const handleDeleteArchivedReceivable = useCallback(
    (entry: ReceivableRow) => {
      Alert.alert(
        "Delete receivable permanently?",
        "This will permanently remove this entry and any of its linked ledger entries. This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteReceivableCompletely(entry.id);
                await loadArchivedPage();
                await load();
              } catch (error) {
                logger.error("receivables", "Delete receivable failed", error);
                Alert.alert("Failed to delete", "Please try again.");
              }
            },
          },
        ]
      );
    },
    [load, loadArchivedPage]
  );

  const runToggleIncludeInTotals = useCallback(
    async (entry: ReceivableRow) => {
      const nextIncludeInTotal: 0 | 1 = entry.includeInTotal === 0 ? 1 : 0;
      try {
        setTogglingIncludeEntryId(entry.id);
        await setReceivableIncludeInTotal(entry.id, nextIncludeInTotal);
        await load();
      } catch (error) {
        logger.error("receivables", "Update receivable include failed", error);
        Alert.alert("Failed to update receivable", "Please try again.");
      } finally {
        setTogglingIncludeEntryId(null);
      }
    },
    [load]
  );

  const actionTargetRemaining = receivablesEntryActionTarget
    ? Math.max(
        0,
        receivablesEntryActionTarget.amount - (receivablesEntryActionTarget.paidAmount ?? 0)
      )
    : 0;
  const isActionTargetSettled = actionTargetRemaining <= 0;
  const isActionTargetExcluded = (receivablesEntryActionTarget?.includeInTotal ?? 1) === 0;
  const canActionTargetAddPayment =
    !!receivablesEntryActionTarget && !isActionTargetSettled && !isActionTargetExcluded;
  const isActionArchivingReceivable =
    receivablesEntryActionTarget != null && archivingId === receivablesEntryActionTarget.id;
  const isActionUpdatingInclude =
    receivablesEntryActionTarget != null &&
    togglingIncludeEntryId === receivablesEntryActionTarget.id;
  const isReceivablesActionBusy = archivingId != null || togglingIncludeEntryId != null;

  const receivableEntryActions = useMemo<ActionBottomSheetAction[]>(() => {
    const noTarget = !receivablesEntryActionTarget;
    const includeToggleLabel =
      receivablesEntryActionTarget?.includeInTotal === 0
        ? "Include in totals"
        : "Exclude from totals";
    return [
      {
        key: "add-payment",
        label: "Add Payment",
        tone: "success",
        Icon: BanknoteArrowUp,
        disabled: noTarget || !canActionTargetAddPayment || isReceivablesActionBusy,
        onPress: () => {
          const target = receivablesEntryActionTarget;
          if (!target || !canActionTargetAddPayment || isReceivablesActionBusy) return;
          closeReceivablesEntryActions();
          openAddReceivablePaymentModal(target);
        },
      },
      {
        key: "edit-details",
        label: "Edit Details",
        Icon: Pencil,
        disabled: noTarget || isReceivablesActionBusy,
        onPress: () => {
          const target = receivablesEntryActionTarget;
          if (!target || isReceivablesActionBusy) return;
          closeReceivablesEntryActions();
          openReceivablesEdit(target);
        },
      },
      {
        key: "include-toggle",
        label: isActionUpdatingInclude ? "Updating..." : includeToggleLabel,
        Icon: CloudAlert,
        disabled: noTarget || isReceivablesActionBusy,
        onPress: () => {
          const target = receivablesEntryActionTarget;
          if (!target || isReceivablesActionBusy) return;
          closeReceivablesEntryActions();
          void runToggleIncludeInTotals(target);
        },
      },
      {
        key: "archive",
        label: isActionArchivingReceivable ? "Archiving..." : "Archive",
        tone: "danger",
        Icon: Trash,
        disabled: noTarget || isReceivablesActionBusy,
        onPress: () => {
          const target = receivablesEntryActionTarget;
          if (!target || isReceivablesActionBusy) return;
          closeReceivablesEntryActions();
          confirmArchiveReceivable(target);
        },
      },
    ];
  }, [
    canActionTargetAddPayment,
    closeReceivablesEntryActions,
    confirmArchiveReceivable,
    isActionArchivingReceivable,
    isActionUpdatingInclude,
    isReceivablesActionBusy,
    openAddReceivablePaymentModal,
    openReceivablesEdit,
    receivablesEntryActionTarget,
    runToggleIncludeInTotals,
  ]);

  return {
    isSwipeLocked,
    todayStart,
    receivablesShowModal,
    receivablesModalMode,
    receivablesModalInitialValues,
    receivablesSaving,
    closeReceivablesModal,
    handleReceivableModalSave,
    receivablesEntryActionTarget,
    openReceivablesEntryActions,
    closeReceivablesEntryActions,
    receivableEntryActions,
    openReceivablesEditById,
    openAddReceivablePayment,
    openReceivablePaymentEditById,
    showAddPaymentModal,
    paymentEntry,
    receivablesPaymentAccounts,
    loadingReceivablesPaymentAccounts,
    closeAddReceivablePaymentModal,
    handleRecordReceivablePayment,
    showPaymentHistoryModal,
    paymentHistory,
    loadingPayments,
    openPaymentHistoryModal,
    closePaymentHistoryModal,
    editingPayment,
    setEditingPayment,
    closeEditPaymentModal,
    handleUpdatePayment,
    confirmDeletePayment,
    showArchivedReceivables,
    openArchivedReceivablesModal,
    closeArchivedReceivablesModal,
    archivedPageRows,
    loadingArchivedInitial,
    handleRestoreArchivedReceivable,
    handleDeleteArchivedReceivable,
  };
}
