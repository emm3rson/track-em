import type { LedgerEntrySourceKind } from "../ledger/types";

export type AccountLedgerSourceKind = LedgerEntrySourceKind;

export type AccountLedgerRow = {
  activityKey: string;
  id: number;
  date: string;
  createdAt: string;
  amount: number;
  accountId: number;
  accountName: string;
  note: string | null;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  transferGroupId: string | null;
  sourceKind: AccountLedgerSourceKind;
  // For grouped transfers, include the linked transaction info
  linkedTransferId: number | null;
  linkedTransferAccountId: number | null;
  linkedTransferAccountName: string | null;
  linkedTransferAmount: number | null;
};
