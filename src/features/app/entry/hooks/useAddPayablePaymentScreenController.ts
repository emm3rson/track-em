import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { loadCategories as loadExpenseCategories } from "../../../../features/expenses/service";
import {
  loadPayablePaymentAccounts,
  loadPayablePaymentByEntry,
  loadPayablesSnapshot,
  recordPayablePayment,
} from "../../../../features/payables/service";
import type { PayablePaymentTarget } from "../../../../features/payables/components/PayableAddPaymentModal";
import type { CreditRow, PayablePaymentAccountRow } from "../../../../features/payables/types";
import type { RootStackParamList } from "../../../../navigation/types";
import { formatMonthLabel, isoDate } from "../../../../utils/dates";

const EMPTY_OPTION = "";

type UseAddPayablePaymentScreenControllerParams = {
  lockedAccountId?: number | null;
};

function selectClosestMonthToCurrent(months: string[]) {
  if (months.length === 0) return EMPTY_OPTION;
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

export function useAddPayablePaymentScreenController(
  params?: UseAddPayablePaymentScreenControllerParams
) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lockedAccountId = params?.lockedAccountId ?? null;
  const lockAccount = lockedAccountId != null;

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [byMonth, setByMonth] = useState<Map<string, Map<string, CreditRow>>>(new Map());
  const [monthOptions, setMonthOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(EMPTY_OPTION);
  const [selectedPlatform, setSelectedPlatform] = useState(EMPTY_OPTION);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentDateEdited, setPaymentDateEdited] = useState(false);

  const [accounts, setAccounts] = useState<PayablePaymentAccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const platformOptions = useMemo(() => {
    if (!selectedMonth) return [];
    const monthRows = byMonth.get(selectedMonth);
    if (!monthRows || monthRows.size === 0) return [];
    return Array.from(monthRows.values())
      .filter((row) => (row.remainingAmount ?? 0) > 0)
      .map((row) => row.platform)
      .sort((a, b) => a.localeCompare(b))
      .map((platform) => ({ label: platform, value: platform }));
  }, [byMonth, selectedMonth]);

  const target = useMemo<PayablePaymentTarget | null>(() => {
    if (!selectedMonth || !selectedPlatform) return null;
    return { month: selectedMonth, platform: selectedPlatform };
  }, [selectedMonth, selectedPlatform]);

  const amountPlaceholder = useMemo(() => {
    if (!target) return "0";
    const amount = byMonth.get(target.month)?.get(target.platform)?.remainingAmount ?? 0;
    return String(amount);
  }, [byMonth, target]);

  const remainingAmount = useMemo(() => {
    if (!target) return 0;
    return byMonth.get(target.month)?.get(target.platform)?.remainingAmount ?? 0;
  }, [byMonth, target]);

  const preferredAccountId = useMemo(() => {
    if (!target) return null;
    return byMonth.get(target.month)?.get(target.platform)?.preferredAccountId ?? null;
  }, [byMonth, target]);

  useEffect(() => {
    if (!selectedMonth) {
      setSelectedPlatform(EMPTY_OPTION);
      return;
    }
    if (platformOptions.length === 0) {
      setSelectedPlatform(EMPTY_OPTION);
      return;
    }
    if (!selectedPlatform || !platformOptions.some((option) => option.value === selectedPlatform)) {
      setSelectedPlatform(platformOptions[0]?.value ?? EMPTY_OPTION);
    }
  }, [platformOptions, selectedMonth, selectedPlatform]);

  useEffect(() => {
    if (!target) {
      setCategoryId(null);
      setPaymentDateEdited(false);
      setPaymentDate(new Date());
      return;
    }
    const nextCategoryId = byMonth.get(target.month)?.get(target.platform)?.categoryId ?? null;
    setCategoryId(nextCategoryId);
  }, [byMonth, target]);

  useEffect(() => {
    setPaymentDateEdited(false);
  }, [target?.month, target?.platform]);

  useEffect(() => {
    if (!target || paymentDateEdited) return;
    let active = true;
    void (async () => {
      try {
        const payment = await loadPayablePaymentByEntry({
          platform: target.platform,
          monthIsoAnchor: target.month,
        });
        if (!active) return;
        const existingPaidAtIso = payment?.paidAt?.slice(0, 10) ?? null;
        const fallbackIso = new Date().toISOString().slice(0, 10);
        setPaymentDate(new Date(existingPaidAtIso ?? fallbackIso));
      } catch {
        if (!active) return;
        const fallbackIso = new Date().toISOString().slice(0, 10);
        setPaymentDate(new Date(fallbackIso));
      }
    })();
    return () => {
      active = false;
    };
  }, [byMonth, paymentDateEdited, target]);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const [snapshot, categoryRows] = await Promise.all([
        loadPayablesSnapshot(),
        loadExpenseCategories(),
      ]);

      const nextByMonth = new Map<string, Map<string, CreditRow>>();
      for (const row of snapshot.rows) {
        if (!snapshot.months.includes(row.month)) continue;
        const monthMap = nextByMonth.get(row.month) ?? new Map<string, CreditRow>();
        monthMap.set(row.platform, row);
        nextByMonth.set(row.month, monthMap);
      }

      const monthsWithEntries = snapshot.months.filter((month) => {
        const monthMap = nextByMonth.get(month);
        return (
          !!monthMap && Array.from(monthMap.values()).some((row) => (row.remainingAmount ?? 0) > 0)
        );
      });

      setByMonth(nextByMonth);
      setMonthOptions(
        monthsWithEntries.map((month) => ({
          label: formatMonthLabel(month),
          value: month,
        }))
      );
      setSelectedMonth(selectClosestMonthToCurrent(monthsWithEntries));

      setCategories(
        (categoryRows ?? []).map((category) => ({ id: category.id, name: category.name }))
      );
    } catch (error) {
      Alert.alert(
        "Unable to load payable payments",
        error instanceof Error ? error.message : "Please try again."
      );
      setByMonth(new Map());
      setMonthOptions([]);
      setSelectedMonth(EMPTY_OPTION);
      setCategories([]);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const loadAccountOptions = useCallback(async () => {
    if (lockAccount) {
      setAccounts([]);
      setLoadingAccounts(false);
      return;
    }
    setLoadingAccounts(true);
    try {
      const rows = await loadPayablePaymentAccounts();
      setAccounts(rows ?? []);
    } catch (error) {
      Alert.alert(
        "Unable to load accounts",
        error instanceof Error ? error.message : "Please try again."
      );
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [lockAccount]);

  useEffect(() => {
    setLoadingCategories(true);
    void (async () => {
      try {
        await loadInitial();
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, [loadInitial]);

  useEffect(() => {
    void loadAccountOptions();
  }, [loadAccountOptions]);

  const close = useCallback(() => {
    if (savingPayment) return;
    navigation.goBack();
  }, [navigation, savingPayment]);

  const handleRecordPayment = useCallback(
    async (amount: number, accountId?: number | null) => {
      if (!target) return;
      const paymentDateIso = isoDate(paymentDate);
      try {
        setSavingPayment(true);
        await recordPayablePayment({
          platform: target.platform,
          monthIsoAnchor: target.month,
          amount,
          accountId,
          categoryIdOverride: categoryId ?? undefined,
          paymentDateIso,
        });
        Alert.alert("Saved", "Payable payment recorded.", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } catch (error) {
        Alert.alert(
          "Failed to record payment",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setSavingPayment(false);
      }
    },
    [categoryId, navigation, paymentDate, target]
  );

  const minPaymentDate = undefined;
  const maxPaymentDate = undefined;

  return {
    loadingInitial,
    accounts,
    loadingAccounts,
    categories,
    loadingCategories,
    categoryId,
    setCategoryId,
    monthOptions,
    selectedMonth,
    selectedPlatform,
    setSelectedMonth,
    setSelectedPlatform,
    platformOptions,
    target,
    amountPlaceholder,
    remainingAmount,
    preferredAccountId,
    savingPayment,
    paymentDate,
    setPaymentDate: (next: Date) => {
      setPaymentDateEdited(true);
      setPaymentDate(next);
    },
    minPaymentDate,
    maxPaymentDate,
    lockAccount,
    lockedAccountId,
    close,
    handleRecordPayment,
  };
}
