import React from "react";
import { View } from "react-native";

import { ActionBottomSheet } from "../../../../components/ui/ActionBottomSheet";
import { AppScreen } from "../../../../ui/components/AppScreen";
import { spacing } from "../../../../styles/tokens";
import { php } from "../../../../utils/currency";
import { isoMonthAnchor, monthStart } from "../../../../utils/dates";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardPayablesImpactSection } from "../components/DashboardPayablesImpactSection";
import { DashboardRecentActivitySection } from "../components/DashboardRecentActivitySection";
import { DashboardTotalsCard } from "../components/DashboardTotalsCard";
import { ledgerSourceKindLabel } from "../../ledger/sourceKind";
import type { DashboardSnapshot } from "../types";
import { useDashboardScreenController } from "../hooks/useDashboardScreenController";

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  totals: {
    wallets: 0,
    savings: 0,
    peopleOwe: 0,
    totalFunds: 0,
  },
  payablesImpact: {
    currentMonth: { credits: 0, net: 0 },
    threeMonthOutlook: { credits: 0, net: 0 },
    allTime: { credits: 0, net: 0 },
    trend: {
      points: [],
      startMonth: isoMonthAnchor(monthStart(new Date())),
      endMonth: isoMonthAnchor(monthStart(new Date())),
    },
  },
  currentMonthSpending: {
    monthAnchor: isoMonthAnchor(monthStart(new Date())),
    spent: 0,
    budget: null,
    subtitle: "No budget set",
    progressRatio: 0,
  },
  savingsBreakdown: [],
  recentActivity: [],
};

export function DashboardScreen() {
  const {
    snapshot,
    loading,
    focusKey,
    onOpenTransactionHistory,
    entryActionTarget,
    closeEntryActions,
    entrySheetActions,
    onPressRecentActivityItem,
  } = useDashboardScreenController();
  const view = snapshot ?? EMPTY_SNAPSHOT;

  return (
    <AppScreen
      loading={loading && !snapshot}
      loadingLabel="Loading dashboard..."
      header={<DashboardHeader />}
      contentContainerStyle={{ gap: spacing.md }}
    >
      <View style={{ gap: spacing.md }}>
        <DashboardTotalsCard totals={view.totals} focusKey={focusKey} />
        <DashboardPayablesImpactSection
          payablesImpact={view.payablesImpact}
          totalFunds={view.totals.totalFunds}
          focusKey={focusKey}
        />
        <DashboardRecentActivitySection
          activity={view.recentActivity}
          onPressOpenHistory={onOpenTransactionHistory}
          onPressActivityItem={onPressRecentActivityItem}
        />
      </View>

      <ActionBottomSheet
        visible={!!entryActionTarget}
        title={
          entryActionTarget?.note?.trim() ||
          ledgerSourceKindLabel(entryActionTarget?.sourceKind ?? "MANUAL_ACCOUNT_ENTRY")
        }
        subtitle={
          entryActionTarget
            ? `${php.format(entryActionTarget.amount)} - ${entryActionTarget.date} - ${entryActionTarget.accountName}`
            : undefined
        }
        actions={entrySheetActions}
        onClose={closeEntryActions}
      />
    </AppScreen>
  );
}
