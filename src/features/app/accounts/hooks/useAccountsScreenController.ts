import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { archiveAccount, setAccountIncludeInTotals } from "../../../../features/accounts/service";
import type { AccountEditState, AccountRow } from "../../../../features/accounts/types";
import type { AccountType } from "../../../../data/types";
import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import type { ActionBottomSheetAction } from "../../../../components/ui/ActionBottomSheet";
import type { RootStackParamList } from "../../../../navigation/types";

import { useAccountsDataState } from "./useAccountsDataState";
import { CloudAlert, FileClock, Pencil, Trash } from "lucide-react-native";

export function useAccountsScreenController() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    scrollRef,
    focusKey,
    walletAccounts,
    savingsAccounts,
    loading,
    showInitialLoading,
    load,
  } = useAccountsDataState();

  const [editing, setEditing] = useState<AccountEditState>(null);
  const [editBalancesOpen, setEditBalancesOpen] = useState(false);
  const [reconcileBalancesOpen, setReconcileBalancesOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<AccountRow | null>(null);
  const [archivingAccountId, setArchivingAccountId] = useState<number | null>(null);
  const [togglingIncludeAccountId, setTogglingIncludeAccountId] = useState<number | null>(null);

  const swipeLocked = !!editing || !!actionTarget || editBalancesOpen || reconcileBalancesOpen;
  useGlobalSwipeLock(swipeLocked);

  const openAdd = useCallback((type: AccountType) => {
    setEditing({ mode: "add", type });
  }, []);

  const openEdit = useCallback((account: AccountRow) => {
    setEditing({ mode: "edit", type: account.type, account });
  }, []);

  const openActions = useCallback((account: AccountRow) => {
    setActionTarget(account);
  }, []);

  const closeActions = useCallback(() => {
    setActionTarget(null);
  }, []);

  const navigateToLedger = useCallback(
    (account: AccountRow) => {
      navigation.navigate("AccountLedger", {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
      });
    },
    [navigation]
  );

  const openEditBalances = useCallback(() => {
    if (walletAccounts.length === 0) {
      Alert.alert("No wallets", "Add a wallet before editing balances.");
      return;
    }
    setEditBalancesOpen(true);
  }, [walletAccounts.length]);

  const openReconcileBalances = useCallback(() => {
    if (savingsAccounts.length === 0) {
      Alert.alert(
        "No savings accounts",
        "Add a savings or investment account before reconciling balances."
      );
      return;
    }
    setReconcileBalancesOpen(true);
  }, [savingsAccounts.length]);

  const runArchiveAccount = useCallback(
    async (account: AccountRow) => {
      try {
        setArchivingAccountId(account.id);
        await archiveAccount(account.id);
        await load();
      } catch {
        Alert.alert("Failed to archive account");
      } finally {
        setArchivingAccountId(null);
        setActionTarget((current) => (current?.id === account.id ? null : current));
      }
    },
    [load]
  );

  const runToggleIncludeInTotals = useCallback(
    async (account: AccountRow) => {
      const nextIncludeInTotals: 0 | 1 = account.includeInTotals === 0 ? 1 : 0;
      try {
        setTogglingIncludeAccountId(account.id);
        await setAccountIncludeInTotals(account.id, nextIncludeInTotals);
        await load();
      } catch {
        Alert.alert("Failed to update account");
      } finally {
        setTogglingIncludeAccountId(null);
        setActionTarget((current) => (current?.id === account.id ? null : current));
      }
    },
    [load]
  );

  const isActionArchivingAccount = actionTarget != null && archivingAccountId === actionTarget.id;
  const isActionUpdatingInclude =
    actionTarget != null && togglingIncludeAccountId === actionTarget.id;
  const isActionBusy = archivingAccountId != null || togglingIncludeAccountId != null;

  const accountActions = useMemo<ActionBottomSheetAction[]>(() => {
    const target = actionTarget;
    const noTarget = !target;
    const includeToggleLabel =
      target?.includeInTotals === 0 ? "Include in totals" : "Exclude from totals";

    return [
      {
        key: "view-transaction-history",
        label: "View Transaction History",
        Icon: FileClock,
        disabled: noTarget || isActionBusy,
        onPress: () => {
          if (!target || isActionBusy) return;
          closeActions();
          navigateToLedger(target);
        },
      },
      {
        key: "edit-account",
        label: "Edit account",
        Icon: Pencil,
        disabled: noTarget || isActionBusy,
        onPress: () => {
          if (!target || isActionBusy) return;
          closeActions();
          openEdit(target);
        },
      },
      {
        key: "include-toggle-account",
        label: isActionUpdatingInclude ? "Updating..." : includeToggleLabel,
        Icon: CloudAlert,
        disabled: noTarget || isActionBusy,
        onPress: () => {
          if (!target || isActionBusy) return;
          closeActions();
          void runToggleIncludeInTotals(target);
        },
      },
      {
        key: "archive-account",
        label: isActionArchivingAccount ? "Archiving..." : "Archive",
        tone: "danger",
        Icon: Trash,
        disabled: noTarget || isActionBusy,
        onPress: () => {
          if (!target || isActionBusy) return;
          closeActions();
          Alert.alert("Archive account?", "This will hide the account from your list.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Archive",
              style: "destructive",
              onPress: () => {
                void runArchiveAccount(target);
              },
            },
          ]);
        },
      },
    ];
  }, [
    actionTarget,
    closeActions,
    isActionArchivingAccount,
    isActionBusy,
    isActionUpdatingInclude,
    runArchiveAccount,
    runToggleIncludeInTotals,
    navigateToLedger,
    openEdit,
  ]);

  return {
    scrollRef,
    focusKey,
    walletAccounts,
    savingsAccounts,
    loading,
    showInitialLoading,
    editing,
    setEditing,
    editBalancesOpen,
    setEditBalancesOpen,
    reconcileBalancesOpen,
    setReconcileBalancesOpen,
    actionTarget,
    load,
    openAdd,
    openEdit,
    openActions,
    closeActions,
    navigateToLedger,
    openEditBalances,
    openReconcileBalances,
    accountActions,
  };
}
