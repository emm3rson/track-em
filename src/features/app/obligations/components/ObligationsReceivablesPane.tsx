import React from "react";

import { ReceivablesListSection } from "../../../../features/receivables/components/ReceivablesListSection";
import type { ReceivableRow } from "../../../../features/receivables/types";

type Props = {
  receivablesRows: ReceivableRow[];
  receivablesArchivedCount: number;
  todayStart: Date;
  openReceivablesEntryActions: (entry: ReceivableRow) => void;
  openPaymentHistoryModal: (entry: ReceivableRow) => void;
  openArchivedReceivablesModal: () => void;
};

export function ObligationsReceivablesPane({
  receivablesRows,
  receivablesArchivedCount,
  todayStart,
  openReceivablesEntryActions,
  openPaymentHistoryModal,
  openArchivedReceivablesModal,
}: Props) {
  return (
    <ReceivablesListSection
      rows={receivablesRows}
      archivedCount={receivablesArchivedCount}
      todayStart={todayStart}
      onOpenEntryActions={openReceivablesEntryActions}
      onOpenPaymentHistory={openPaymentHistoryModal}
      onOpenArchives={openArchivedReceivablesModal}
    />
  );
}
