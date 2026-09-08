import type { AccountType, ExpenseCategoryRow } from "../../../data/types";

export type EntryAccountOption = {
  id: number;
  name: string;
  type: AccountType;
  institution: string | null;
  balance: number;
};

export type ExpenseEntryMeta = {
  categories: ExpenseCategoryRow[];
  accounts: EntryAccountOption[];
};

export type ExpenseEntryInput = {
  dateIso: string;
  amount: number;
  categoryId: number;
  accountId: number | null;
  note: string | null;
};

export type IncomeEntryInput = {
  accountId: number;
  dateIso: string;
  amount: number;
  note: string | null;
};

export type TransferEntryInput = {
  fromAccountId: number;
  toAccountId: number;
  dateIso: string;
  receivedAmount: number;
  feeAmount: number;
  note: string | null;
};

export type PayableEntryInput = {
  platform: string;
  monthIsoAnchor: string;
  dueDateIso?: string | null;
  amount: number;
  categoryId?: number | null;
  preferredAccountId?: number | null;
};

export type ReceivableEntryInput = {
  person: string;
  amount: number;
  dateIso: string;
  note: string | null;
  targetPaymentDate: string | null;
  preferredAccountId?: number | null;
};

export type LentMoneyEntryInput = {
  person: string;
  amount: number;
  dateIso: string;
  note: string | null;
  targetPaymentDate: string | null;
  accountId: number;
};

export type EntrySaveResult = {
  ok: true;
  message: string;
};

export type EntryLinkedAccountOption = EntryAccountOption;
