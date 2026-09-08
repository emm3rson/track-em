import { useCallback, useEffect, useMemo, useState } from "react";

import { php } from "../../../../utils/currency";
import { formatMonthLabel } from "../../../../utils/dates";
import type { CreditRow } from "../../../../features/payables/types";
import type { ReceivableRow } from "../../../../features/receivables/types";
import type { PayableEntryTarget } from "../types";

type UseObligationsFabPaymentFlowParams = {
  months: string[];
  byMonth: Map<string, Map<string, CreditRow>>;
  receivablesRows: ReceivableRow[];
  // Payable payment control
  openAddPayablePayment: (target: PayableEntryTarget) => void;
  addPaymentTarget: PayableEntryTarget | null;
  closeAddPayablePaymentRaw: () => void;
  // Receivable payment control
  openAddReceivablePayment: (entry: ReceivableRow) => void;
  showAddReceivablePaymentModal: boolean;
  closeAddReceivablePaymentRaw: () => void;
};

function selectClosestMonthToCurrent(months: string[]) {
  if (months.length === 0) return "";
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return [...months].sort((a, b) => {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    const diffA = Math.abs(timeA - currentMonthStart);
    const diffB = Math.abs(timeB - currentMonthStart);
    if (diffA !== diffB) return diffA - diffB;
    return timeB - timeA;
  })[0];
}

export function useObligationsFabPaymentFlow({
  months,
  byMonth,
  receivablesRows,
  openAddPayablePayment,
  addPaymentTarget,
  closeAddPayablePaymentRaw,
  openAddReceivablePayment,
  showAddReceivablePaymentModal,
  closeAddReceivablePaymentRaw,
}: UseObligationsFabPaymentFlowParams) {
  const [isFabPayablePaymentFlow, setIsFabPayablePaymentFlow] = useState(false);
  const [isFabReceivablePaymentFlow, setIsFabReceivablePaymentFlow] = useState(false);
  const [fabPayableMonth, setFabPayableMonth] = useState("");
  const [fabPayablePlatform, setFabPayablePlatform] = useState("");
  const [fabReceivableId, setFabReceivableId] = useState<number | "none">("none");

  const payableMonthsWithEntries = useMemo(
    () =>
      months.filter((month) => {
        const platformMap = byMonth.get(month);
        return (
          !!platformMap &&
          Array.from(platformMap.values()).some((row) => (row.remainingAmount ?? 0) > 0)
        );
      }),
    [byMonth, months]
  );
  const canAddPayablePayment = payableMonthsWithEntries.length > 0;

  const selectedPayablePlatforms = useMemo(() => {
    if (!fabPayableMonth) return [];
    const platformMap = byMonth.get(fabPayableMonth);
    if (!platformMap || platformMap.size === 0) return [];
    return Array.from(platformMap.values())
      .filter((row) => (row.remainingAmount ?? 0) > 0)
      .sort((a, b) => a.platform.localeCompare(b.platform))
      .map((row) => row.platform);
  }, [byMonth, fabPayableMonth]);

  const fabPayableMonthOptions = useMemo(
    () =>
      payableMonthsWithEntries.map((month) => ({
        label: formatMonthLabel(month),
        value: month,
      })),
    [payableMonthsWithEntries]
  );

  const fabPayableEntryOptions = useMemo(
    () =>
      selectedPayablePlatforms.map((platform) => ({
        label: platform,
        value: platform,
      })),
    [selectedPayablePlatforms]
  );

  const eligibleReceivables = useMemo(
    () =>
      receivablesRows.filter((row) => {
        const remaining = row.amount - (row.paidAmount ?? 0);
        return remaining > 0 && row.includeInTotal !== 0;
      }),
    [receivablesRows]
  );
  const canAddReceivablePayment = eligibleReceivables.length > 0;

  const fabReceivableOptions = useMemo(
    () =>
      eligibleReceivables.map((row) => {
        const remaining = Math.max(0, row.amount - (row.paidAmount ?? 0));
        return {
          label: `${row.person} (${php.format(remaining)} remaining)`,
          value: row.id as number | "none",
        };
      }),
    [eligibleReceivables]
  );

  // Reset selected month when data changes
  useEffect(() => {
    if (!canAddPayablePayment) {
      setFabPayableMonth("");
      setFabPayablePlatform("");
      return;
    }
    if (!fabPayableMonth || !payableMonthsWithEntries.includes(fabPayableMonth)) {
      setFabPayableMonth(selectClosestMonthToCurrent(payableMonthsWithEntries));
    }
  }, [canAddPayablePayment, fabPayableMonth, payableMonthsWithEntries]);

  // Reset selected platform when month or data changes
  useEffect(() => {
    if (selectedPayablePlatforms.length === 0) {
      setFabPayablePlatform("");
      return;
    }
    if (!fabPayablePlatform || !selectedPayablePlatforms.includes(fabPayablePlatform)) {
      setFabPayablePlatform(selectedPayablePlatforms[0]);
    }
  }, [fabPayablePlatform, selectedPayablePlatforms]);

  // Reset selected receivable when data changes
  useEffect(() => {
    if (!canAddReceivablePayment) {
      setFabReceivableId("none");
      return;
    }
    if (
      fabReceivableId === "none" ||
      !eligibleReceivables.some((row) => row.id === fabReceivableId)
    ) {
      setFabReceivableId(eligibleReceivables[0].id);
    }
  }, [canAddReceivablePayment, eligibleReceivables, fabReceivableId]);

  // Clear FAB payable flow flag when the payable payment modal closes
  useEffect(() => {
    if (addPaymentTarget) return;
    setIsFabPayablePaymentFlow(false);
  }, [addPaymentTarget]);

  // Clear FAB receivable flow flag when the receivable payment modal closes
  useEffect(() => {
    if (showAddReceivablePaymentModal) return;
    setIsFabReceivablePaymentFlow(false);
  }, [showAddReceivablePaymentModal]);

  const openFabPayablePaymentModal = useCallback((): boolean => {
    const closestMonth = selectClosestMonthToCurrent(payableMonthsWithEntries);
    const month =
      fabPayableMonth && payableMonthsWithEntries.includes(fabPayableMonth)
        ? fabPayableMonth
        : closestMonth;
    if (!month) return false;

    const platformKeys = Array.from(byMonth.get(month)?.keys() ?? []).sort((a, b) =>
      a.localeCompare(b)
    );
    const platform =
      fabPayablePlatform && platformKeys.includes(fabPayablePlatform)
        ? fabPayablePlatform
        : platformKeys[0];
    if (!platform) return false;

    if (month !== fabPayableMonth) setFabPayableMonth(month);
    if (platform !== fabPayablePlatform) setFabPayablePlatform(platform);

    setIsFabPayablePaymentFlow(true);
    openAddPayablePayment({ month, platform });
    return true;
  }, [
    byMonth,
    fabPayableMonth,
    fabPayablePlatform,
    openAddPayablePayment,
    payableMonthsWithEntries,
  ]);

  const openFabReceivablePaymentModal = useCallback((): boolean => {
    const selected =
      typeof fabReceivableId === "number"
        ? eligibleReceivables.find((row) => row.id === fabReceivableId)
        : undefined;
    const target = selected ?? eligibleReceivables[0];
    if (!target) return false;

    if (fabReceivableId !== target.id) {
      setFabReceivableId(target.id);
    }

    setIsFabReceivablePaymentFlow(true);
    openAddReceivablePayment(target);
    return true;
  }, [eligibleReceivables, fabReceivableId, openAddReceivablePayment]);

  const handleFabPayableMonthChange = useCallback(
    (month: string) => {
      setFabPayableMonth(month);
      const platformMap = byMonth.get(month);
      const firstPlatform = platformMap ? Array.from(platformMap.keys()).sort()[0] : "";
      setFabPayablePlatform(firstPlatform ?? "");
      if (isFabPayablePaymentFlow && firstPlatform) {
        openAddPayablePayment({ month, platform: firstPlatform });
      }
    },
    [byMonth, isFabPayablePaymentFlow, openAddPayablePayment]
  );

  const handleFabPayablePlatformChange = useCallback(
    (platform: string) => {
      setFabPayablePlatform(platform);
      if (isFabPayablePaymentFlow && fabPayableMonth) {
        openAddPayablePayment({ month: fabPayableMonth, platform });
      }
    },
    [fabPayableMonth, isFabPayablePaymentFlow, openAddPayablePayment]
  );

  const resolveFabReceivableById = useCallback(
    (id: number) => eligibleReceivables.find((row) => row.id === id) ?? null,
    [eligibleReceivables]
  );

  const handleFabReceivableChange = useCallback((value: number | "none") => {
    setFabReceivableId(value);
  }, []);

  const fabPayableAmountPlaceholder = useMemo(() => {
    if (!fabPayableMonth || !fabPayablePlatform) return "0";
    const amount = byMonth.get(fabPayableMonth)?.get(fabPayablePlatform)?.remainingAmount ?? 0;
    return String(amount);
  }, [byMonth, fabPayableMonth, fabPayablePlatform]);

  const closeAddPayablePaymentModal = useCallback(() => {
    setIsFabPayablePaymentFlow(false);
    closeAddPayablePaymentRaw();
  }, [closeAddPayablePaymentRaw]);

  const closeAddReceivablePaymentModal = useCallback(() => {
    setIsFabReceivablePaymentFlow(false);
    closeAddReceivablePaymentRaw();
  }, [closeAddReceivablePaymentRaw]);

  return {
    openFabPayablePaymentModal,
    openFabReceivablePaymentModal,
    closeAddPayablePaymentModal,
    closeAddReceivablePaymentModal,
    fabPayableMonth,
    handleFabPayableMonthChange,
    fabPayableMonthOptions,
    fabPayablePlatform,
    handleFabPayablePlatformChange,
    fabPayableEntryOptions,
    fabPayableAmountPlaceholder,
    canAddPayablePayment,
    isFabPayablePaymentFlow,
    fabReceivableId,
    handleFabReceivableChange,
    resolveFabReceivableById,
    fabReceivableOptions,
    canAddReceivablePayment,
    isFabReceivablePaymentFlow,
  };
}
