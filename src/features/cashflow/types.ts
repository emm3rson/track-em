import type { AccountType } from "../../data/types";

export type RecentCashflowSourceKind =
  | "MANUAL_ACCOUNT_ENTRY"
  | "RECONCILIATION_ACCOUNT_ENTRY"
  | "ADJUSTMENT_ACCOUNT_ENTRY"
  | "EXPENSE_ACCOUNT_ENTRY"
  | "RECEIVABLE_ACCOUNT_ENTRY"
  | "PAYABLE_ACCOUNT_ENTRY"
  | "LENT_MONEY_ACCOUNT_ENTRY";

export type RecentCashflowRow = {
  activityKey: string;
  id: number;
  date: string; // yyyy-mm-dd
  createdAt: string;
  amount: number;
  accountId: number;
  accountType: AccountType;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  transferGroupId: string | null;
  note: string | null;
  accountName: string;
  sourceKind: RecentCashflowSourceKind;
};

export type SavingsAccountRow = {
  id: number;
  name: string;
  balance: number;
};

export type CashflowFilterAccountRow = {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
};
