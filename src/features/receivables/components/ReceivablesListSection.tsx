import React from "react";

import { Text } from "../../../components/Themed";
import { InlinePillAction } from "../../../components/ui/InlinePillAction";
import { SectionCard } from "../../../components/ui/SectionCard";
import { useTheme } from "../../../theme/ThemeProvider";
import type { ReceivableRow } from "../types";
import { ReceivableEntryCard } from "./ReceivableEntryCard";

type ReceivablesListSectionProps = {
  rows: ReceivableRow[];
  archivedCount: number;
  todayStart: Date;
  onOpenEntryActions: (entry: ReceivableRow) => void;
  onOpenPaymentHistory: (entry: ReceivableRow) => void;
  onOpenArchives: () => void;
};

export function ReceivablesListSection({
  rows,
  archivedCount,
  todayStart,
  onOpenEntryActions,
  onOpenPaymentHistory,
  onOpenArchives,
}: ReceivablesListSectionProps) {
  const { colors } = useTheme();

  return (
    <>
      {rows.length === 0 ? (
        <SectionCard style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>No receivables yet</Text>
          <Text style={{ color: colors.mutedText }}>
            Track who owes you. Tap the + button to log a receivable.
          </Text>
        </SectionCard>
      ) : (
        rows.map((row) => (
          <ReceivableEntryCard
            key={row.id}
            entry={row}
            todayStart={todayStart}
            onOpenActions={onOpenEntryActions}
            onOpenPaymentHistory={onOpenPaymentHistory}
          />
        ))
      )}

      {archivedCount > 0 ? (
        <InlinePillAction
          accessibilityLabel="View archived receivables"
          label="View Archives"
          onPress={onOpenArchives}
          style={{ alignSelf: "flex-end" }}
        />
      ) : null}
    </>
  );
}
