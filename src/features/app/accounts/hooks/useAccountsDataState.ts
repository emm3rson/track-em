import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";

import type { AccountRow } from "../../../../features/accounts/types";
import { loadAccounts } from "../../../../features/accounts/service";

export function useAccountsDataState() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const loadingRef = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);
  useScrollToTop(scrollRef);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const rows = await loadAccounts();
      setAccounts(rows);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setFocusKey((prev) => prev + 1);
      void (async () => {
        await load();
        if (active) {
          setInitialLoaded(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const walletAccounts = useMemo(
    () =>
      accounts
        .filter((a) => a.type === "SOURCE")
        .slice()
        .sort(
          (a, b) => (b.includeInTotals ?? 0) - (a.includeInTotals ?? 0) || b.balance - a.balance
        ),
    [accounts]
  );

  const savingsAccounts = useMemo(
    () =>
      accounts
        .filter((a) => a.type === "SAVINGS")
        .slice()
        .sort(
          (a, b) => (b.includeInTotals ?? 0) - (a.includeInTotals ?? 0) || b.balance - a.balance
        ),
    [accounts]
  );

  const showInitialLoading = !initialLoaded && accounts.length === 0;

  return {
    scrollRef,
    focusKey,
    accounts,
    walletAccounts,
    savingsAccounts,
    loading,
    showInitialLoading,
    load,
  };
}
