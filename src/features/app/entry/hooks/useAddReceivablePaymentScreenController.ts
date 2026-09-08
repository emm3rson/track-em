import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  loadReceivablePaymentAccounts,
  loadReceivables,
  recordReceivablePayment,
} from "../../../../features/receivables/service";
import type {
  ReceivablePaymentAccountRow,
  ReceivableRow,
} from "../../../../features/receivables/types";
import type { RootStackParamList } from "../../../../navigation/types";
import { php } from "../../../../utils/currency";

export function useAddReceivablePaymentScreenController(lockedAccountId?: number | null) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lockAccount = lockedAccountId != null;

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [entries, setEntries] = useState<ReceivableRow[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | "none">("none");
  const [preferredAccountId, setPreferredAccountId] = useState<number | null>(null);

  const [accounts, setAccounts] = useState<ReceivablePaymentAccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const entryOptions = useMemo(
    () =>
      entries.map((row) => {
        const remaining = Math.max(0, row.amount - (row.paidAmount ?? 0));
        return {
          label: `${row.person} (${php.format(remaining)} remaining)`,
          value: row.id as number | "none",
        };
      }),
    [entries]
  );

  const resolveEntryById = useCallback(
    (id: number) => entries.find((row) => row.id === id) ?? null,
    [entries]
  );

  const selectedEntry = useMemo(
    () => (typeof selectedEntryId === "number" ? resolveEntryById(selectedEntryId) : null),
    [resolveEntryById, selectedEntryId]
  );

  // When the selected entry changes, pre-populate the preferred account
  const handleSetSelectedEntryId = useCallback(
    (id: number | "none") => {
      setSelectedEntryId(id);
      if (typeof id === "number") {
        const entry = entries.find((r) => r.id === id);
        setPreferredAccountId(entry?.preferredAccountId ?? null);
      } else {
        setPreferredAccountId(null);
      }
    },
    [entries]
  );

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const result = await loadReceivables();
      const eligible = result.rows.filter((row) => {
        const remaining = row.amount - (row.paidAmount ?? 0);
        return remaining > 0 && row.includeInTotal !== 0;
      });
      setEntries(eligible);
      const firstEntry = eligible[0];
      const firstId = firstEntry?.id ?? "none";
      setSelectedEntryId(firstId);
      setPreferredAccountId(
        typeof firstId === "number" ? (firstEntry?.preferredAccountId ?? null) : null
      );
    } catch (error) {
      Alert.alert(
        "Unable to load receivables",
        error instanceof Error ? error.message : "Please try again."
      );
      setEntries([]);
      setSelectedEntryId("none");
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    if (lockAccount) {
      setAccounts([]);
      setLoadingAccounts(false);
      return;
    }
    setLoadingAccounts(true);
    try {
      const rows = await loadReceivablePaymentAccounts();
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
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const close = useCallback(() => {
    if (savingPayment) return;
    navigation.goBack();
  }, [navigation, savingPayment]);

  const handleRecordPayment = useCallback(
    async (amount: number, note?: string, accountId?: number | null) => {
      if (!selectedEntry) return;
      try {
        setSavingPayment(true);
        await recordReceivablePayment({
          entry: selectedEntry,
          amount,
          note,
          accountId,
        });
        Alert.alert("Saved", "Receivable payment recorded.", [
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
    [navigation, selectedEntry]
  );

  return {
    loadingInitial,
    entries,
    selectedEntryId,
    setSelectedEntryId: handleSetSelectedEntryId,
    selectedEntry,
    entryOptions,
    resolveEntryById,
    accounts,
    loadingAccounts,
    savingPayment,
    lockedAccountId,
    lockAccount,
    preferredAccountId,
    close,
    handleRecordPayment,
  };
}
