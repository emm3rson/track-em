import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";

import { addMonths, isoMonthAnchor, monthStart } from "../../../../utils/dates";
import type { CreditRow } from "../../../../features/payables/types";
import type { ReceivableRow } from "../../../../features/receivables/types";

import { loadPayablesSnapshot } from "../../../../features/payables/service";
import { loadReceivables as loadReceivablesSnapshot } from "../../../../features/receivables/service";

export function useObligationsDataState() {
  const [payablesSnapshot, setPayablesSnapshot] = useState({
    rows: [] as CreditRow[],
    months: [] as string[],
    archivedMonths: [] as string[],
    autoArchivedMonths: [] as string[],
    statusTotalsByMonth: new Map<string, { paid: number; remaining: number }>(),
  });
  const [payablesInitialLoaded, setPayablesInitialLoaded] = useState(false);

  const [receivablesRows, setReceivablesRows] = useState<ReceivableRow[]>([]);
  const [receivablesArchivedCount, setReceivablesArchivedCount] = useState(0);
  const [receivablesInitialLoaded, setReceivablesInitialLoaded] = useState(false);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [payables, receivables] = await Promise.all([
        loadPayablesSnapshot(),
        loadReceivablesSnapshot(),
      ]);
      setPayablesSnapshot(payables);
      setReceivablesRows(receivables.rows);
      setReceivablesArchivedCount(receivables.archivedCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        await load();
        if (active) {
          setPayablesInitialLoaded(true);
          setReceivablesInitialLoaded(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const scrollRef = useRef<ScrollView | null>(null);
  useScrollToTop(scrollRef);

  const { rows, months, archivedMonths, autoArchivedMonths, statusTotalsByMonth } =
    payablesSnapshot;
  const byMonth = useMemo(() => {
    const map = new Map<string, Map<string, CreditRow>>();
    for (const row of rows) {
      if (!map.has(row.month)) map.set(row.month, new Map());
      map.get(row.month)!.set(row.platform, row);
    }
    return map;
  }, [rows]);

  const autoArchivedSet = useMemo(() => new Set(autoArchivedMonths), [autoArchivedMonths]);

  const currentMonthAnchor = useMemo(() => isoMonthAnchor(monthStart(new Date())), []);
  const nextMonthAnchor = useMemo(() => {
    const last = months[months.length - 1];
    if (!last) return currentMonthAnchor;
    return isoMonthAnchor(addMonths(new Date(last), 1));
  }, [currentMonthAnchor, months]);

  return {
    load,
    loading,
    scrollRef,
    rows,
    months,
    archivedMonths,
    byMonth,
    statusTotalsByMonth,
    autoArchivedSet,
    currentMonthAnchor,
    nextMonthAnchor,
    payablesInitialLoaded,
    receivablesRows,
    receivablesArchivedCount,
    receivablesInitialLoaded,
  };
}
