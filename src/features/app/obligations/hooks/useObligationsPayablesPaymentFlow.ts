import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Alert } from "react-native";

import type { CreditRow, PayablePaymentAccountRow } from "../../../../features/payables/types";
import type { PayablePaymentRow } from "../../../../features/payables/types";
import {
  deletePayment as deletePayablePayment,
  getPayment as getPayablePayment,
  loadPayableById,
  loadPayablePaymentAccounts,
  loadPayablePaymentByEntry,
  loadPayments as loadPayablePayments,
  recordPayablePayment,
  updatePayment as updatePayablePayment,
} from "../../../../features/payables/service";
import { loadCategories as loadExpenseCategories } from "../../../../features/expenses/service";
import { isoDate } from "../../../../utils/dates";
import { logger } from "../../../../utils/logger";
import type { PayableEntryTarget } from "../types";

type UseObligationsPayablesPaymentFlowParams = {
  load: () => Promise<void>;
  byMonth: Map<string, Map<string, CreditRow>>;
  setSavingPayment: Dispatch<SetStateAction<boolean>>;
};

export function useObligationsPayablesPaymentFlow({
  load,
  byMonth,
  setSavingPayment,
}: UseObligationsPayablesPaymentFlowParams) {
  const [addPaymentTarget, setAddPaymentTarget] = useState<PayableEntryTarget | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<PayablePaymentAccountRow[]>([]);
  const [paymentCategories, setPaymentCategories] = useState<{ id: number; name: string }[]>([]);
  const [loadingPaymentCategories, setLoadingPaymentCategories] = useState(false);
  const [paymentCategoryId, setPaymentCategoryId] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentDateEdited, setPaymentDateEdited] = useState(false);
  const [loadingPaymentAccounts, setLoadingPaymentAccounts] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [paymentHistoryEntry, setPaymentHistoryEntry] = useState<CreditRow | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PayablePaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PayablePaymentRow | null>(null);

  // Confirmed: `addPaymentTarget ?? payablesEntryActionTarget` fallback is dead code because
  // openAddPayablePayment always nulls payablesEntryActionTarget before setting addPaymentTarget.
  const selectedAmountPlaceholder = useMemo(() => {
    if (!addPaymentTarget) return "0";
    const remaining =
      byMonth.get(addPaymentTarget.month)?.get(addPaymentTarget.platform)?.remainingAmount ?? 0;
    return String(remaining);
  }, [addPaymentTarget, byMonth]);

  const selectedPreferredAccountId = useMemo(() => {
    if (!addPaymentTarget) return null;
    return (
      byMonth.get(addPaymentTarget.month)?.get(addPaymentTarget.platform)?.preferredAccountId ??
      null
    );
  }, [addPaymentTarget, byMonth]);

  const selectedRemainingAmount = useMemo(() => {
    if (!addPaymentTarget) return 0;
    return (
      byMonth.get(addPaymentTarget.month)?.get(addPaymentTarget.platform)?.remainingAmount ?? 0
    );
  }, [addPaymentTarget, byMonth]);

  const minPaymentDate = undefined;
  const maxPaymentDate = undefined;

  const loadPaymentAccountsAction = useCallback(async () => {
    try {
      setLoadingPaymentAccounts(true);
      const nextRows = await loadPayablePaymentAccounts();
      setPaymentAccounts(nextRows ?? []);
    } catch (error) {
      logger.error("payables", "Load payable payment accounts failed", error);
      Alert.alert("Unable to load accounts", "Please try again.");
      setPaymentAccounts([]);
    } finally {
      setLoadingPaymentAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (!addPaymentTarget) {
      setPaymentAccounts([]);
      setLoadingPaymentAccounts(false);
      setPaymentCategories([]);
      setLoadingPaymentCategories(false);
      setPaymentCategoryId(null);
      setPaymentDateEdited(false);
      setPaymentDate(new Date());
      return;
    }
    void loadPaymentAccountsAction();
    void (async () => {
      try {
        setLoadingPaymentCategories(true);
        const nextCategories = await loadExpenseCategories();
        setPaymentCategories(
          nextCategories.map((category) => ({ id: category.id, name: category.name }))
        );
        const payableRow =
          byMonth.get(addPaymentTarget.month)?.get(addPaymentTarget.platform) ?? null;
        setPaymentCategoryId(payableRow?.categoryId ?? null);
        if (!paymentDateEdited) {
          const existingPayment = await loadPayablePaymentByEntry({
            platform: addPaymentTarget.platform,
            monthIsoAnchor: addPaymentTarget.month,
          });
          const existingPaidAtIso = existingPayment?.paidAt?.slice(0, 10) ?? null;
          const fallbackIso = new Date().toISOString().slice(0, 10);
          setPaymentDate(new Date(existingPaidAtIso ?? fallbackIso));
        }
      } catch (error) {
        logger.error("payables", "Load payable categories failed", error);
        setPaymentCategories([]);
        setPaymentCategoryId(null);
      } finally {
        setLoadingPaymentCategories(false);
      }
    })();
  }, [addPaymentTarget, byMonth, loadPaymentAccountsAction, paymentDateEdited]);

  useEffect(() => {
    if (!paymentHistoryEntry) return;
    const updated = byMonth.get(paymentHistoryEntry.month)?.get(paymentHistoryEntry.platform);
    if (updated && updated !== paymentHistoryEntry) {
      setPaymentHistoryEntry(updated);
    }
  }, [byMonth, paymentHistoryEntry]);

  const loadPaymentsForEntry = useCallback(async (payableId: number | null) => {
    if (!payableId) {
      setPaymentHistory([]);
      return [];
    }
    try {
      setLoadingPayments(true);
      const rows = await loadPayablePayments(payableId);
      setPaymentHistory(rows ?? []);
      return rows ?? [];
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    if (!showPaymentHistoryModal || !paymentHistoryEntry) {
      setPaymentHistory([]);
      return;
    }
    void loadPaymentsForEntry(paymentHistoryEntry.id);
  }, [loadPaymentsForEntry, paymentHistoryEntry, showPaymentHistoryModal]);

  // Called by EntryFlow when a payable entry is deleted to clear stale modal state
  const onPaymentTargetInvalidated = useCallback((target: PayableEntryTarget) => {
    setAddPaymentTarget((current) =>
      current && current.month === target.month && current.platform === target.platform
        ? null
        : current
    );
  }, []);

  const openAddPayablePayment = useCallback((target: PayableEntryTarget) => {
    setAddPaymentTarget(target);
    setPaymentDateEdited(false);
  }, []);

  const closeAddPaymentModal = useCallback(() => {
    setAddPaymentTarget(null);
    setPaymentAccounts([]);
    setLoadingPaymentAccounts(false);
    setPaymentCategories([]);
    setLoadingPaymentCategories(false);
    setPaymentCategoryId(null);
    setPaymentDateEdited(false);
    setPaymentDate(new Date());
    setSavingPayment(false);
  }, [setSavingPayment]);

  const openPaymentHistoryModal = useCallback((entry: CreditRow) => {
    setPaymentHistoryEntry(entry);
    setShowPaymentHistoryModal(true);
  }, []);

  const closePaymentHistoryModal = useCallback(() => {
    setShowPaymentHistoryModal(false);
    setPaymentHistoryEntry(null);
    setPaymentHistory([]);
    setEditingPayment(null);
  }, []);

  const openPayablePaymentEditById = useCallback(
    async (paymentId: number) => {
      const payment = await getPayablePayment(paymentId);
      if (!payment) return false;

      let targetEntry =
        Array.from(byMonth.values())
          .flatMap((monthMap) => Array.from(monthMap.values()))
          .find((row) => row.id === payment.payableId) ?? null;
      if (!targetEntry) {
        targetEntry = await loadPayableById(payment.payableId);
      }
      if (!targetEntry) return false;

      setPaymentHistoryEntry(targetEntry);
      setShowPaymentHistoryModal(true);
      const payments = await loadPaymentsForEntry(targetEntry.id);
      const selectedPayment = payments.find((row) => row.id === paymentId) ?? payment;
      setEditingPayment(selectedPayment);
      return true;
    },
    [byMonth, loadPaymentsForEntry]
  );

  const closeEditPaymentModal = useCallback(() => {
    setEditingPayment(null);
  }, []);

  const handleRecordPayablePayment = useCallback(
    async (
      amount: number,
      accountId?: number | null,
      targetOverride?: PayableEntryTarget | null
    ) => {
      const target = targetOverride ?? addPaymentTarget;
      if (!target) return;
      const paymentDateIso = isoDate(paymentDate);
      try {
        setSavingPayment(true);
        await recordPayablePayment({
          platform: target.platform,
          monthIsoAnchor: target.month,
          amount,
          accountId,
          categoryIdOverride: paymentCategoryId ?? undefined,
          paymentDateIso,
        });
        await load();
        closeAddPaymentModal();
      } catch (error) {
        logger.error("payables", "Record payable payment failed", error);
        Alert.alert(
          "Failed to record payment",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSavingPayment(false);
      }
    },
    [addPaymentTarget, closeAddPaymentModal, load, paymentCategoryId, paymentDate, setSavingPayment]
  );

  const handleUpdatePayment = useCallback(
    async (payment: PayablePaymentRow, amount: number, paymentDateIso: string) => {
      if (!paymentHistoryEntry) return;
      try {
        setSavingPayment(true);
        await updatePayablePayment({
          entry: paymentHistoryEntry,
          paymentId: payment.id,
          amount,
          accountId: payment.accountId ?? null,
          categoryIdOverride: paymentHistoryEntry.categoryId ?? null,
          paymentDateIso,
        });
        await load();
        await loadPaymentsForEntry(paymentHistoryEntry.id);
        setEditingPayment(null);
      } catch (error) {
        logger.error("payables", "Update payable payment failed", error);
        Alert.alert(
          "Failed to update payment",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSavingPayment(false);
      }
    },
    [load, loadPaymentsForEntry, paymentHistoryEntry, setSavingPayment]
  );

  const confirmDeletePayment = useCallback(
    (payment: PayablePaymentRow) => {
      Alert.alert("Delete payment?", "This will remove the payment history entry.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!paymentHistoryEntry) return;
            try {
              setSavingPayment(true);
              await deletePayablePayment({ entry: paymentHistoryEntry, paymentId: payment.id });
              await load();
              await loadPaymentsForEntry(paymentHistoryEntry.id);
              if (editingPayment?.id === payment.id) {
                setEditingPayment(null);
              }
            } catch (error) {
              logger.error("payables", "Delete payable payment failed", error);
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
    [editingPayment?.id, load, loadPaymentsForEntry, paymentHistoryEntry, setSavingPayment]
  );

  return {
    addPaymentTarget,
    selectedAmountPlaceholder,
    selectedRemainingAmount,
    selectedPreferredAccountId,
    paymentAccounts,
    paymentCategories,
    loadingPaymentCategories,
    paymentCategoryId,
    setPaymentCategoryId,
    loadingPaymentAccounts,
    paymentDate,
    setPaymentDate: (next: Date) => {
      setPaymentDateEdited(true);
      setPaymentDate(next);
    },
    minPaymentDate,
    maxPaymentDate,
    openAddPayablePayment,
    closeAddPaymentModal,
    handleRecordPayablePayment,
    showPaymentHistoryModal,
    paymentHistoryEntry,
    paymentHistory,
    loadingPayments,
    openPaymentHistoryModal,
    closePaymentHistoryModal,
    openPayablePaymentEditById,
    editingPayment,
    setEditingPayment,
    closeEditPaymentModal,
    handleUpdatePayment,
    confirmDeletePayment,
    onPaymentTargetInvalidated,
  };
}
