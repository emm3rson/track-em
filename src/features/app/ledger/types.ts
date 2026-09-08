export type LedgerEntrySourceKind =
  | "MANUAL_ACCOUNT_ENTRY"
  | "RECONCILIATION_ACCOUNT_ENTRY"
  | "ADJUSTMENT_ACCOUNT_ENTRY"
  | "EXPENSE_ACCOUNT_ENTRY"
  | "RECEIVABLE_ACCOUNT_ENTRY"
  | "PAYABLE_ACCOUNT_ENTRY"
  | "LENT_MONEY_ACCOUNT_ENTRY";

export type LedgerEntryActionTarget = {
  activityKey: string;
  id: number;
  date: string;
  createdAt: string;
  amount: number;
  note: string | null;
  accountId: number;
  accountName: string;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  transferGroupId: string | null;
  sourceKind: LedgerEntrySourceKind;
};
