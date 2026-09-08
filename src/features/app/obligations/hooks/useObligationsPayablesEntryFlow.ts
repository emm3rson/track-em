import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { CreditRow, PayablePaymentAccountRow } from "../../../../features/payables/types";
import {
  deletePayable,
  duplicatePayableToMonth,
  loadPayablePaymentAccounts,
  updatePayableDetails,
} from "../../../../features/payables/service";
import { loadCategories as loadExpenseCategories } from "../../../../features/expenses/service";
import { addMonths, formatMonthLabel, isoDate, isoMonthAnchor } from "../../../../utils/dates";
import { confirmDiscardChanges } from "../../../../utils/confirm";
import { logger } from "../../../../utils/logger";
import { parseNumber } from "../../../../utils/parseNumber";
import type { PayableEntryTarget } from "../types";
import { Copy, Pencil, BanknoteArrowDown, Trash } from "lucide-react-native";

function buildDuplicateMonthTargets(currentMonthAnchor: string): string[] {
  const baseDate = new Date(currentMonthAnchor);
  const offsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, -1, -2];
  const seen = new Set<string>();
  const months: string[] = [];

  for (const offset of offsets) {
    const month = isoMonthAnchor(addMonths(baseDate, offset));
    if (seen.has(month)) continue;
    seen.add(month);
    months.push(month);
  }

  return months;
}

type UseObligationsPayablesEntryFlowParams = {
  load: () => Promise<void>;
  byMonth: Map<string, Map<string, CreditRow>>;
  currentMonthAnchor: string;
  // Injected PaymentFlow callbacks (avoids direct import/coupling)
  onOpenAddPayablePayment: (target: PayableEntryTarget) => void;
  onOpenPaymentHistory: (entry: CreditRow) => void;
  onPaymentTargetInvalidated: (target: PayableEntryTarget) => void;
};

export function useObligationsPayablesEntryFlow({
  load,
  byMonth,
  currentMonthAnchor,
  onOpenAddPayablePayment,
  onOpenPaymentHistory,
  onPaymentTargetInvalidated,
}: UseObligationsPayablesEntryFlowParams) {
  const [payablesEditing, setPayablesEditing] = useState<PayableEntryTarget | null>(null);
  const [payablesEditAmount, setPayablesEditAmount] = useState("");
  const [payablesEditDueDate, setPayablesEditDueDate] = useState<Date | null>(null);
  const [payablesEditCategoryId, setPayablesEditCategoryId] = useState<number | null>(null);
  const [payablesEditPreferredAccountId, setPayablesEditPreferredAccountId] = useState<
    number | null
  >(null);
  const [payablesEditPlatform, setPayablesEditPlatform] = useState("");
  const [payablesEditCategories, setPayablesEditCategories] = useState<
    { id: number; name: string }[]
  >([]);
  const [payablesEditAccounts, setPayablesEditAccounts] = useState<PayablePaymentAccountRow[]>([]);
  const [loadingPayablesEditCategories, setLoadingPayablesEditCategories] = useState(false);
  const [loadingPayablesEditAccounts, setLoadingPayablesEditAccounts] = useState(false);
  const [payablesEntryActionTarget, setPayablesEntryActionTarget] =
    useState<PayableEntryTarget | null>(null);
  const [showDuplicateEntryModal, setShowDuplicateEntryModal] = useState(false);
  const [duplicateEntryTarget, setDuplicateEntryTarget] = useState<PayableEntryTarget | null>(null);
  const [duplicateTargetMonths, setDuplicateTargetMonths] = useState<string[]>([]);
  const [deletingEntryKey, setDeletingEntryKey] = useState<string | null>(null);
  const [duplicatingEntryKey, setDuplicatingEntryKey] = useState<string | null>(null);

  const payablesEditInitialRef = useRef<{
    amount: string;
    dueDateIso: string | null;
    categoryId: number | null;
    preferredAccountId: number | null;
    platform: string;
  } | null>(null);

  const duplicateTargetMonthOptions = useMemo(() => {
    const sourcePlatform = duplicateEntryTarget?.platform;
    return buildDuplicateMonthTargets(currentMonthAnchor).map((month) => ({
      label: formatMonthLabel(month),
      value: month,
      disabled: sourcePlatform ? !!byMonth.get(month)?.get(sourcePlatform) : false,
    }));
  }, [byMonth, currentMonthAnchor, duplicateEntryTarget]);

  const selectedActionRow = useMemo(() => {
    if (!payablesEntryActionTarget) return null;
    return (
      byMonth.get(payablesEntryActionTarget.month)?.get(payablesEntryActionTarget.platform) ?? null
    );
  }, [byMonth, payablesEntryActionTarget]);

  const isSelectedPaid = (selectedActionRow?.remainingAmount ?? 0) <= 0;

  const payablesIsEditDirty =
    !!payablesEditing &&
    !!payablesEditInitialRef.current &&
    (payablesEditAmount !== payablesEditInitialRef.current.amount ||
      (payablesEditDueDate ? isoDate(payablesEditDueDate) : null) !==
        payablesEditInitialRef.current.dueDateIso ||
      payablesEditCategoryId !== payablesEditInitialRef.current.categoryId ||
      payablesEditPreferredAccountId !== payablesEditInitialRef.current.preferredAccountId ||
      payablesEditPlatform !== payablesEditInitialRef.current.platform);

  const payablesEditMonthAnchor = payablesEditing ? new Date(payablesEditing.month) : new Date();
  const payablesEditMinDueDate = new Date(
    payablesEditMonthAnchor.getFullYear(),
    payablesEditMonthAnchor.getMonth(),
    1
  );
  const payablesEditMaxDueDate = new Date(
    payablesEditMonthAnchor.getFullYear(),
    payablesEditMonthAnchor.getMonth() + 1,
    0
  );

  const actionEntryKey = payablesEntryActionTarget
    ? `${payablesEntryActionTarget.month}:${payablesEntryActionTarget.platform}`
    : null;
  const isActionArchivingEntry = actionEntryKey != null && deletingEntryKey === actionEntryKey;
  const isActionDuplicatingEntry =
    actionEntryKey != null &&
    !!duplicatingEntryKey &&
    (duplicatingEntryKey === `batch:${actionEntryKey}` ||
      duplicatingEntryKey.startsWith(`${actionEntryKey}->`));
  const duplicateModalEntryKey = duplicateEntryTarget
    ? `batch:${duplicateEntryTarget.month}:${duplicateEntryTarget.platform}`
    : null;
  const isSubmittingDuplicateEntry =
    duplicateModalEntryKey != null && duplicateModalEntryKey === duplicatingEntryKey;

  const openPayablesEntryActions = useCallback((target: PayableEntryTarget) => {
    setPayablesEntryActionTarget(target);
  }, []);

  const openPayablesEdit = useCallback(
    (month: string, platform: string) => {
      const row = byMonth.get(month)?.get(platform);
      setPayablesEditing({ month, platform });
      setPayablesEditAmount(String(row?.amount ?? 0));
      setPayablesEditPlatform(platform);
      const dueDateIso = row?.dueDate ?? null;
      const categoryId = row?.categoryId ?? null;
      const preferredAccountId = row?.preferredAccountId ?? null;
      setPayablesEditDueDate(dueDateIso ? new Date(dueDateIso) : null);
      setPayablesEditCategoryId(categoryId);
      setPayablesEditPreferredAccountId(preferredAccountId);
      payablesEditInitialRef.current = {
        amount: String(row?.amount ?? 0),
        dueDateIso,
        categoryId,
        preferredAccountId,
        platform,
      };
      void (async () => {
        try {
          setLoadingPayablesEditCategories(true);
          setLoadingPayablesEditAccounts(true);
          const [categories, accounts] = await Promise.all([
            loadExpenseCategories(),
            loadPayablePaymentAccounts(),
          ]);
          setPayablesEditCategories(
            (categories ?? []).map((category) => ({ id: category.id, name: category.name }))
          );
          setPayablesEditAccounts(accounts ?? []);
        } catch (error) {
          logger.error("payables", "Load edit payable options failed", error);
          setPayablesEditCategories([]);
          setPayablesEditAccounts([]);
        } finally {
          setLoadingPayablesEditCategories(false);
          setLoadingPayablesEditAccounts(false);
        }
      })();
    },
    [byMonth]
  );

  const savePayablesEdit = useCallback(async () => {
    if (!payablesEditing) return;
    const amount = parseNumber(payablesEditAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert("Invalid amount", "Enter a non-negative number for the monthly payable.");
      return;
    }
    if (!payablesEditPlatform.trim()) {
      Alert.alert("Invalid name", "Payable name cannot be empty.");
      return;
    }
    const dueDateIso = payablesEditDueDate ? isoDate(payablesEditDueDate) : null;
    if (dueDateIso && dueDateIso.slice(0, 7) !== payablesEditing.month.slice(0, 7)) {
      Alert.alert("Invalid due date", "Due date must be within the selected month.");
      return;
    }
    await updatePayableDetails({
      previousPlatform: payablesEditing.platform,
      platform: payablesEditPlatform.trim(),
      monthIsoAnchor: payablesEditing.month,
      dueDateIso,
      amount,
      categoryId: payablesEditCategoryId ?? null,
      preferredAccountId: payablesEditPreferredAccountId ?? null,
    });
    setPayablesEditing(null);
    setPayablesEditPlatform("");
    setPayablesEditCategories([]);
    setPayablesEditAccounts([]);
    setLoadingPayablesEditCategories(false);
    setLoadingPayablesEditAccounts(false);
    payablesEditInitialRef.current = null;
    await load();
  }, [
    load,
    payablesEditAmount,
    payablesEditCategoryId,
    payablesEditDueDate,
    payablesEditPreferredAccountId,
    payablesEditPlatform,
    payablesEditing,
  ]);

  const attemptClosePayablesEdit = useCallback(() => {
    if (!payablesEditing) return;
    const clearEdit = () => {
      setPayablesEditing(null);
      setPayablesEditPlatform("");
      setPayablesEditCategories([]);
      setPayablesEditAccounts([]);
      setLoadingPayablesEditCategories(false);
      setLoadingPayablesEditAccounts(false);
      payablesEditInitialRef.current = null;
    };
    if (!payablesIsEditDirty) {
      clearEdit();
      return;
    }
    confirmDiscardChanges(clearEdit);
  }, [payablesEditing, payablesIsEditDirty]);

  const confirmDeletePayableEntry = useCallback(
    (target: PayableEntryTarget) => {
      const key = `${target.month}:${target.platform}`;
      if (deletingEntryKey === key) return;
      // Clear own state
      setPayablesEntryActionTarget(null);
      // Notify PaymentFlow to clear addPaymentTarget if it matches this entry
      onPaymentTargetInvalidated(target);
      if (
        payablesEditing &&
        payablesEditing.month === target.month &&
        payablesEditing.platform === target.platform
      ) {
        setPayablesEditing(null);
        payablesEditInitialRef.current = null;
      }
      Alert.alert(
        "Archive payable?",
        `This will remove ${target.platform} from ${formatMonthLabel(target.month)}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            style: "destructive",
            onPress: async () => {
              try {
                setDeletingEntryKey(key);
                await deletePayable(target.platform, target.month);
                await load();
              } catch (error) {
                logger.error("payables", "Delete payable failed", error);
                Alert.alert("Failed to archive", "Please try again.");
              } finally {
                setDeletingEntryKey(null);
              }
            },
          },
        ]
      );
    },
    [deletingEntryKey, load, onPaymentTargetInvalidated, payablesEditing]
  );

  const openDuplicateEntryModal = useCallback((target: PayableEntryTarget) => {
    setPayablesEntryActionTarget(null);
    setDuplicateEntryTarget(target);
    setDuplicateTargetMonths([]);
    setShowDuplicateEntryModal(true);
  }, []);

  const closeDuplicateEntryModal = useCallback(() => {
    setShowDuplicateEntryModal(false);
    setDuplicateEntryTarget(null);
    setDuplicateTargetMonths([]);
  }, []);

  const toggleDuplicateTargetMonth = useCallback(
    (month: string) => {
      const isDisabled = duplicateTargetMonthOptions.some(
        (option) => option.value === month && option.disabled
      );
      if (isDisabled) return;
      setDuplicateTargetMonths((current) => {
        if (current.includes(month)) {
          return current.filter((value) => value !== month);
        }
        return [...current, month];
      });
    },
    [duplicateTargetMonthOptions]
  );

  const submitDuplicateEntry = useCallback(async () => {
    if (!duplicateEntryTarget) return;
    if (duplicateTargetMonths.length === 0) {
      Alert.alert("Select months", "Choose at least one target month to continue.");
      return;
    }

    const target = duplicateEntryTarget;
    const current = byMonth.get(target.month)?.get(target.platform);
    if (!current) return;
    const amount = current.amount ?? 0;
    const categoryId = current.categoryId ?? null;
    const preferredAccountId = current.preferredAccountId ?? null;
    const sourceKey = `${target.month}:${target.platform}`;
    const key = `batch:${sourceKey}`;
    if (duplicatingEntryKey === key) return;

    const optionByMonth = new Map(
      duplicateTargetMonthOptions.map((option) => [option.value, option])
    );
    const targetMonths = duplicateTargetMonths.filter((month) => {
      const option = optionByMonth.get(month);
      return !!option && !option.disabled;
    });

    if (targetMonths.length === 0) {
      Alert.alert("No selectable months", "All selected months already contain this payable.");
      return;
    }

    const successfulMonths: string[] = [];
    const failedMonths: string[] = [];

    try {
      setDuplicatingEntryKey(key);
      for (const month of targetMonths) {
        try {
          await duplicatePayableToMonth({
            platform: target.platform,
            targetMonthIsoAnchor: month,
            sourceDueDateIso: current.dueDate ?? null,
            amount,
            status: "UNPAID",
            categoryId: categoryId ?? null,
            preferredAccountId,
          });
          successfulMonths.push(month);
        } catch (error) {
          logger.error("payables", "Duplicate payable to month failed", error);
          failedMonths.push(month);
        }
      }

      if (successfulMonths.length > 0) {
        await load();
      }

      closeDuplicateEntryModal();

      if (failedMonths.length === 0) {
        const monthLabel = successfulMonths.length === 1 ? "month" : "months";
        Alert.alert(
          "Duplicate complete",
          `Duplicated to ${successfulMonths.length} ${monthLabel}.`
        );
      } else {
        const monthLabel = successfulMonths.length === 1 ? "month" : "months";
        const failedMonthLabel = failedMonths.length === 1 ? "month" : "months";
        Alert.alert(
          "Duplicate finished with issues",
          `Duplicated to ${successfulMonths.length} ${monthLabel}. Failed on ${failedMonths.length} ${failedMonthLabel}.`
        );
      }
    } catch (error) {
      logger.error("payables", "Duplicate payable failed", error);
      Alert.alert("Failed to duplicate", "Please try again.");
    } finally {
      setDuplicatingEntryKey(null);
    }
  }, [
    byMonth,
    closeDuplicateEntryModal,
    duplicateEntryTarget,
    duplicateTargetMonthOptions,
    duplicateTargetMonths,
    duplicatingEntryKey,
    load,
  ]);

  const payableEntryActions = useMemo<ActionBottomSheetAction[]>(() => {
    const noTarget = !payablesEntryActionTarget;
    const hasPaymentHistory = (selectedActionRow?.paymentCount ?? 0) > 0;
    const canAddPayment = !isSelectedPaid;
    return [
      {
        key: "payment",
        label: "Add Payment",
        tone: "success",
        Icon: BanknoteArrowDown,
        disabled: noTarget || !canAddPayment,
        onPress: () => {
          if (!payablesEntryActionTarget || !canAddPayment) return;
          const target = payablesEntryActionTarget;
          setPayablesEntryActionTarget(null);
          onOpenAddPayablePayment(target);
        },
      },
      {
        key: "history",
        label: "View Payments",
        Icon: Pencil,
        disabled: noTarget || !hasPaymentHistory,
        onPress: () => {
          if (!selectedActionRow) return;
          setPayablesEntryActionTarget(null);
          onOpenPaymentHistory(selectedActionRow);
        },
      },
      {
        key: "edit",
        label: "Edit Details",
        Icon: Pencil,
        disabled: noTarget,
        onPress: () => {
          if (!payablesEntryActionTarget) return;
          const target = payablesEntryActionTarget;
          setPayablesEntryActionTarget(null);
          openPayablesEdit(target.month, target.platform);
        },
      },
      {
        key: "duplicate",
        label: isActionDuplicatingEntry
          ? "Duplicating..."
          : `Duplicate ${payablesEntryActionTarget?.platform ?? ""} to Month`,
        Icon: Copy,
        disabled: noTarget || isActionDuplicatingEntry || isActionArchivingEntry,
        onPress: () => {
          if (!payablesEntryActionTarget) return;
          openDuplicateEntryModal(payablesEntryActionTarget);
        },
      },
      {
        key: "archive",
        label: isActionArchivingEntry ? "Archiving..." : "Archive",
        tone: "danger",
        Icon: Trash,
        disabled: noTarget || isActionDuplicatingEntry || isActionArchivingEntry,
        onPress: () => {
          if (!payablesEntryActionTarget) return;
          confirmDeletePayableEntry(payablesEntryActionTarget);
        },
      },
    ];
  }, [
    confirmDeletePayableEntry,
    isActionArchivingEntry,
    isActionDuplicatingEntry,
    isSelectedPaid,
    onOpenAddPayablePayment,
    onOpenPaymentHistory,
    openDuplicateEntryModal,
    openPayablesEdit,
    payablesEntryActionTarget,
    selectedActionRow,
  ]);

  return {
    payablesEntryActionTarget,
    setPayablesEntryActionTarget,
    openPayablesEntryActions,
    payableEntryActions,
    showDuplicateEntryModal,
    duplicateEntryTarget,
    duplicateTargetMonths,
    toggleDuplicateTargetMonth,
    duplicateTargetMonthOptions,
    closeDuplicateEntryModal,
    submitDuplicateEntry,
    isSubmittingDuplicateEntry,
    payablesEditing,
    payablesEditAmount,
    setPayablesEditAmount,
    payablesEditDueDate,
    setPayablesEditDueDate,
    payablesEditCategoryId,
    setPayablesEditCategoryId,
    payablesEditPreferredAccountId,
    setPayablesEditPreferredAccountId,
    payablesEditPlatform,
    setPayablesEditPlatform,
    payablesEditCategories,
    payablesEditAccounts,
    loadingPayablesEditCategories,
    loadingPayablesEditAccounts,
    payablesEditMinDueDate,
    payablesEditMaxDueDate,
    attemptClosePayablesEdit,
    savePayablesEdit,
    confirmDeletePayableEntry,
    isSwipeLocked: !!payablesEditing || !!payablesEntryActionTarget || showDuplicateEntryModal,
  };
}
