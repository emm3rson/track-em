import type { LedgerEntrySourceKind } from "./types";

export function ledgerSourceKindLabel(sourceKind: LedgerEntrySourceKind): string {
  switch (sourceKind) {
    case "EXPENSE_ACCOUNT_ENTRY":
      return "Expense-linked";
    case "RECEIVABLE_ACCOUNT_ENTRY":
      return "Receivable-linked";
    case "PAYABLE_ACCOUNT_ENTRY":
      return "Payable-linked";
    case "LENT_MONEY_ACCOUNT_ENTRY":
      return "Lent money";
    case "RECONCILIATION_ACCOUNT_ENTRY":
      return "Reconciliation";
    case "ADJUSTMENT_ACCOUNT_ENTRY":
      return "Balance adjustment";
    default:
      return "Manual entry";
  }
}

export function ledgerSourceKindBadgeLabel(sourceKind: LedgerEntrySourceKind): string | null {
  if (sourceKind === "MANUAL_ACCOUNT_ENTRY") {
    return null;
  }
  return ledgerSourceKindLabel(sourceKind);
}
