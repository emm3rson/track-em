import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { isoDate } from "../../../../utils/dates";
import {
  loadTransactionHistoryFilterAccounts,
  loadTransactionHistoryRows,
} from "../../../../features/cashflow/service";
import type {
  TransactionHistoryAccountFilterOption,
  TransactionHistoryDatePreset,
  TransactionHistoryRow,
} from "../types";

const PAGE_SIZE = 20;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function minusDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() - days);
  return next;
}

function resolveDateRange(filters: {
  datePreset: TransactionHistoryDatePreset;
  customFromDate: Date;
  customToDate: Date;
}) {
  const today = startOfDay(new Date());

  if (filters.datePreset === "LAST_7_DAYS") {
    return {
      startDateIso: isoDate(minusDays(today, 6)),
      endDateIso: isoDate(today),
      errorMessage: null as string | null,
    };
  }

  if (filters.datePreset === "LAST_30_DAYS") {
    return {
      startDateIso: isoDate(minusDays(today, 29)),
      endDateIso: isoDate(today),
      errorMessage: null as string | null,
    };
  }

  if (filters.datePreset === "ALL_TIME") {
    return {
      startDateIso: null,
      endDateIso: null,
      errorMessage: null as string | null,
    };
  }

  const start = startOfDay(filters.customFromDate);
  const end = startOfDay(filters.customToDate);

  if (start.getTime() > end.getTime()) {
    return {
      startDateIso: null,
      endDateIso: null,
      errorMessage: "Start date cannot be after end date.",
    };
  }

  return {
    startDateIso: isoDate(start),
    endDateIso: isoDate(end),
    errorMessage: null as string | null,
  };
}

export function useTransactionHistoryFiltersData() {
  const today = startOfDay(new Date());
  const initialFromDate = minusDays(today, 6);
  const initialToDate = today;

  const [accountOptions, setAccountOptions] = useState<TransactionHistoryAccountFilterOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [datePreset, setDatePreset] = useState<TransactionHistoryDatePreset>("LAST_7_DAYS");
  const [customFromDate, setCustomFromDate] = useState(initialFromDate);
  const [customToDate, setCustomToDate] = useState(initialToDate);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const [rows, setRows] = useState<TransactionHistoryRow[]>([]);
  const rowsRef = useRef<TransactionHistoryRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filtersRef = useRef({
    accountId: null as number | null,
    datePreset: "LAST_7_DAYS" as TransactionHistoryDatePreset,
    customFromDate: initialFromDate,
    customToDate: initialToDate,
  });
  const requestIdRef = useRef(0);

  const loadFilterAccounts = useCallback(async () => {
    try {
      const next = await loadTransactionHistoryFilterAccounts();
      setAccountOptions(next);
    } catch {
      // Keep existing options and allow history rows to continue loading.
    }
  }, []);

  const fetchRows = useCallback(async (params?: { append?: boolean }) => {
    const append = params?.append ?? false;
    const requestId = ++requestIdRef.current;
    const activeFilters = filtersRef.current;
    const dateRange = resolveDateRange({
      datePreset: activeFilters.datePreset,
      customFromDate: activeFilters.customFromDate,
      customToDate: activeFilters.customToDate,
    });

    if (dateRange.errorMessage) {
      if (!append) {
        setRows([]);
        rowsRef.current = [];
      }
      setHasMore(false);
      setErrorMessage(dateRange.errorMessage);
      setLoading(false);
      setLoadingMore(false);
      setLoadedOnce(true);
      return;
    }

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const nextRows = await loadTransactionHistoryRows({
        accountId: activeFilters.accountId,
        startDateIso: dateRange.startDateIso,
        endDateIso: dateRange.endDateIso,
        limit: PAGE_SIZE,
        offset: append ? rowsRef.current.length : 0,
      });

      if (requestId !== requestIdRef.current) return;

      setErrorMessage(null);
      setRows((current) => {
        const merged = append ? [...current, ...nextRows] : nextRows;
        rowsRef.current = merged;
        return merged;
      });
      setHasMore(nextRows.length === PAGE_SIZE);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setHasMore(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load transaction history."
      );
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setLoadingMore(false);
      setLoadedOnce(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFilterAccounts();
      void fetchRows();
      return () => {
        requestIdRef.current += 1;
      };
    }, [fetchRows, loadFilterAccounts])
  );

  const refresh = useCallback(async () => {
    await fetchRows();
  }, [fetchRows]);

  const changeAccountFilter = useCallback(
    (nextAccountId: number | null) => {
      filtersRef.current.accountId = nextAccountId;
      setSelectedAccountId(nextAccountId);
      void fetchRows();
    },
    [fetchRows]
  );

  const changeDatePreset = useCallback(
    (nextPreset: TransactionHistoryDatePreset) => {
      filtersRef.current.datePreset = nextPreset;
      setDatePreset(nextPreset);
      void fetchRows();
    },
    [fetchRows]
  );

  const changeCustomFromDate = useCallback(
    (nextDate: Date) => {
      const normalized = startOfDay(nextDate);
      filtersRef.current.customFromDate = normalized;
      setCustomFromDate(normalized);
      if (filtersRef.current.datePreset === "CUSTOM") {
        void fetchRows();
      }
    },
    [fetchRows]
  );

  const changeCustomToDate = useCallback(
    (nextDate: Date) => {
      const normalized = startOfDay(nextDate);
      filtersRef.current.customToDate = normalized;
      setCustomToDate(normalized);
      if (filtersRef.current.datePreset === "CUSTOM") {
        void fetchRows();
      }
    },
    [fetchRows]
  );

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void fetchRows({ append: true });
  }, [fetchRows, hasMore, loading, loadingMore]);

  return {
    rowsRef,
    rows,
    loading,
    loadingMore,
    loadedOnce,
    hasMore,
    errorMessage,
    refresh,
    loadMore,
    accountOptions,
    selectedAccountId,
    changeAccountFilter,
    datePreset,
    changeDatePreset,
    customFromDate,
    customToDate,
    changeCustomFromDate,
    changeCustomToDate,
    showFromDatePicker,
    setShowFromDatePicker,
    showToDatePicker,
    setShowToDatePicker,
  };
}
