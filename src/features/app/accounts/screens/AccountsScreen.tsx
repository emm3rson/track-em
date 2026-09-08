import React from "react";
import { StyleSheet, View } from "react-native";

import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { AccountSection } from "../../../../features/accounts/components/AccountSection";
import { AccountFormModal } from "../../../../features/accounts/components/AccountFormModal";
import { BatchEditBalances } from "../../../../features/accounts/components/BatchEditBalances";
import { BatchReconcile } from "../../../../features/accounts/components/BatchReconcile";
import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { layout, spacing, typography } from "../../../../styles/tokens";
import { AppScreen } from "../../../../ui/components/AppScreen";
import { AccountsHeader } from "../components/AccountsHeader";
import { useAccountsScreenController } from "../hooks/useAccountsScreenController";

export function AccountsScreen() {
  const {
    scrollRef,
    focusKey,
    walletAccounts,
    savingsAccounts,
    showInitialLoading,
    loading,
    editing,
    setEditing,
    editBalancesOpen,
    setEditBalancesOpen,
    reconcileBalancesOpen,
    setReconcileBalancesOpen,
    actionTarget,
    load,
    openAdd,
    openActions,
    closeActions,
    openEditBalances,
    openReconcileBalances,
    accountActions,
  } = useAccountsScreenController();

  return (
    <AppScreen
      loading={showInitialLoading}
      loadingLabel="Loading accounts..."
      scrollRef={scrollRef}
      header={<AccountsHeader onRefresh={load} refreshing={loading} />}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.actionRow}>
        <PrimaryButton
          accessibilityLabel="Add wallet"
          onPress={() => openAdd("SOURCE")}
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
        >
          + Wallet
        </PrimaryButton>
        <PrimaryButton
          accessibilityLabel="Add savings or investment account"
          onPress={() => openAdd("SAVINGS")}
          style={styles.actionButton}
          textStyle={styles.actionButtonText}
        >
          + Savings/Investment
        </PrimaryButton>
      </View>

      <AccountSection
        title="Wallets"
        rows={walletAccounts}
        onPressRow={openActions}
        actionLabel="Adjust"
        onActionPress={openEditBalances}
        onAddPress={() => openAdd("SOURCE")}
        emptyTitle="No wallets yet"
        emptyDescription="Add wallets or cards to keep your available cash accurate."
        emptyActionLabel="Add Wallet"
      />

      <AccountSection
        title="Savings & Investments"
        rows={savingsAccounts}
        onPressRow={openActions}
        actionLabel="Reconcile"
        onActionPress={openReconcileBalances}
        variant="savings"
        progressTriggerKey={focusKey}
        onAddPress={() => openAdd("SAVINGS")}
        emptyTitle="No savings or investments yet"
        emptyDescription="Add a savings or investment account to track progress."
        emptyActionLabel="Add Savings/Investment Account"
      />

      <ActionBottomSheet
        visible={!!actionTarget}
        title={actionTarget ? `Actions for ${actionTarget.name}` : "Account Actions"}
        actions={accountActions}
        onClose={closeActions}
      />

      <AccountFormModal editing={editing} onClose={() => setEditing(null)} onSaved={load} />

      <BatchReconcile
        visible={reconcileBalancesOpen}
        accounts={savingsAccounts}
        onClose={() => setReconcileBalancesOpen(false)}
        onReconciled={load}
      />

      <BatchEditBalances
        visible={editBalancesOpen}
        accounts={walletAccounts}
        onClose={() => setEditBalancesOpen(false)}
        onSaved={load}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: layout.screenPadding,
    gap: layout.screenGap,
    backgroundColor: "transparent",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonText: {
    textAlign: "center",
    fontSize: typography.body,
  },
});
