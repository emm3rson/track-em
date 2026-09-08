import React from "react";

import { Text as ThemedText } from "../../../../components/Themed";
import { InlinePillAction } from "../../../../components/ui/InlinePillAction";
import { PrimaryButton } from "../../../../components/ui/PrimaryButton";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { spacing } from "../../../../styles/tokens";
import { useTheme } from "../../../../theme/ThemeProvider";
import { PayableMonthCard } from "./PayableMonthCard";
import type { CreditRow } from "../../../../features/payables/types";
import type { PayableEntryTarget } from "../types";

type Props = {
  rows: CreditRow[];
  months: string[];
  archivedMonths: string[];
  byMonth: Map<string, Map<string, CreditRow>>;
  statusTotalsByMonth: Map<string, { paid: number; remaining: number }>;
  addingMonth: boolean;
  onAddMonth: () => void;
  openMonthActionsSheet: (month: string) => void;
  openPayablesEntryActions: (target: PayableEntryTarget) => void;
  setShowArchives: (show: boolean) => void;
};

export function ObligationsPayablesPane({
  rows,
  months,
  archivedMonths,
  byMonth,
  statusTotalsByMonth,
  addingMonth,
  onAddMonth,
  openMonthActionsSheet,
  openPayablesEntryActions,
  setShowArchives,
}: Props) {
  const { colors } = useTheme();

  return (
    <>
      {rows.length === 0 && months.length === 0 ? (
        <SectionCard style={{ gap: spacing.xs }}>
          <ThemedText style={{ fontSize: 18, fontWeight: "800" }}>No payables yet</ThemedText>
          <ThemedText style={{ color: colors.mutedText }}>
            Tap + Month below to start tracking your bills.
          </ThemedText>
        </SectionCard>
      ) : null}

      {months.map((month) => (
        <PayableMonthCard
          key={month}
          month={month}
          platformMap={byMonth.get(month) ?? new Map()}
          totals={statusTotalsByMonth.get(month) ?? { paid: 0, remaining: 0 }}
          onOpenMonthActionsSheet={openMonthActionsSheet}
          onOpenEntryActions={openPayablesEntryActions}
        />
      ))}

      <PrimaryButton
        accessibilityRole="button"
        accessibilityLabel="Add payable month"
        onPress={onAddMonth}
        disabled={addingMonth}
        loading={addingMonth}
        style={{ alignSelf: "stretch" }}
      >
        {addingMonth ? "Adding..." : "+ Month"}
      </PrimaryButton>

      {archivedMonths.length > 0 ? (
        <InlinePillAction
          label="View Archives"
          accessibilityLabel="View archived payable months"
          onPress={() => setShowArchives(true)}
          style={{ alignSelf: "flex-end" }}
        />
      ) : null}
    </>
  );
}
