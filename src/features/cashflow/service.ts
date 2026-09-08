import {
  accountService,
  fromCents,
  payableService,
  receivableService,
  toCents,
  transferService,
} from "../../data";
import { loadAccounts } from "../accounts/service";
import type { LedgerEntryActionTarget } from "../app/ledger/types";
import type {
  TransactionHistoryAccountFilterOption,
  TransactionHistoryRow,
} from "../app/dashboard/types";
import type { CashflowFilterAccountRow, RecentCashflowRow, SavingsAccountRow } from "./types";

export async function loadSavingsAccounts(): Promise<SavingsAccountRow[]> {
  const rows = await accountService.listActiveByType("SAVINGS");
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    balance: fromCents(row.balance ?? 0),
  }));
}

export async function loadRecentFilterAccounts(): Promise<CashflowFilterAccountRow[]> {
  const rows = await accountService.listActive();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    balance: fromCents(row.balance ?? 0),
  }));
}

export async function loadRecentTransactions(params: {
  limit: number;
  offset: number;
  accountId?: number | null;
}): Promise<RecentCashflowRow[]> {
  const result = await accountService.getAccountActivity(params);
  return (result ?? []).map((row) => ({
    ...row,
    amount: fromCents(row.amount ?? 0),
    linkedExpenseId: row.linkedExpenseId ?? null,
    linkedReceivablePaymentId: row.linkedReceivablePaymentId ?? null,
    linkedPayablePaymentId: row.linkedPayablePaymentId ?? null,
    transferGroupId: row.transferGroupId ?? null,
    note: row.note ?? null,
    sourceKind: row.sourceKind as RecentCashflowRow["sourceKind"],
  }));
}

export async function createTransaction(params: {
  accountId: number;
  dateIso: string;
  amount: number;
  note?: string;
}) {
  await accountService.addManualEntry({
    accountId: params.accountId,
    dateIso: params.dateIso,
    amount: toCents(params.amount),
    note: params.note,
  });
}

export async function editTransaction(params: {
  id: number;
  accountId?: number;
  dateIso: string;
  amount: number;
  note?: string;
}) {
  const existing = await accountService.getTransaction(params.id);
  if (existing?.transferGroupId != null) {
    throw new Error("Transfer transactions cannot be edited individually.");
  }
  if (existing?.linkedExpenseId != null) {
    throw new Error("Expense-linked transactions can only be edited from Monthly Expenses.");
  }
  if (existing?.linkedReceivablePaymentId != null) {
    throw new Error("Receivable-linked transactions can only be edited from Receivables.");
  }
  if (existing?.linkedPayablePaymentId != null) {
    throw new Error("Payable-linked transactions can only be edited from Payables.");
  }
  if (existing?.entryKind === "LENT_MONEY_LINK") {
    throw new Error("Lent money transactions can only be edited from Receivables.");
  }

  await accountService.updateTransaction({
    id: params.id,
    accountId: params.accountId,
    dateIso: params.dateIso,
    amount: toCents(params.amount),
    note: params.note,
  });
}

export async function removeTransaction(id: number) {
  const existing = await accountService.getTransaction(id);
  if (existing?.transferGroupId != null) {
    await transferService.deleteTransfer(existing.transferGroupId);
    return;
  }
  if (existing?.linkedExpenseId != null) {
    throw new Error("Expense-linked transactions can only be deleted from Monthly Expenses.");
  }
  if (existing?.linkedReceivablePaymentId != null) {
    throw new Error("Receivable-linked transactions can only be deleted from Receivables.");
  }
  if (existing?.linkedPayablePaymentId != null) {
    throw new Error("Payable-linked transactions can only be deleted from Payables.");
  }
  if (existing?.entryKind === "LENT_MONEY_LINK") {
    throw new Error("Lent money transactions can only be deleted from Receivables.");
  }

  await accountService.deleteTransaction(id);
}

export async function createTransferEntry(params: {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  fee?: number;
  dateIso: string;
  note?: string | null;
}) {
  return transferService.createTransfer({
    fromAccountId: params.fromAccountId,
    toAccountId: params.toAccountId,
    amount: toCents(params.amount),
    fee: params.fee != null ? toCents(params.fee) : 0,
    dateIso: params.dateIso,
    note: params.note,
  });
}

export async function loadTransactionHistoryRows(params: {
  accountId?: number | null;
  startDateIso?: string | null;
  endDateIso?: string | null;
  limit: number;
  offset: number;
}): Promise<TransactionHistoryRow[]> {
  const rows = await accountService.getFilteredActivity({
    accountId: params.accountId,
    startDate: params.startDateIso,
    endDate: params.endDateIso,
    limit: params.limit,
    offset: params.offset,
  });

  return (rows ?? []).map((row) => ({
    activityKey: row.activityKey,
    id: row.id,
    date: row.date,
    createdAt: row.createdAt,
    amount: fromCents(row.amount ?? 0),
    accountId: row.accountId,
    accountName: row.accountName,
    accountType: row.accountType,
    note: row.note ?? null,
    linkedExpenseId: row.linkedExpenseId ?? null,
    linkedReceivablePaymentId: row.linkedReceivablePaymentId ?? null,
    linkedPayablePaymentId: row.linkedPayablePaymentId ?? null,
    transferGroupId: row.transferGroupId ?? null,
    sourceKind: row.sourceKind as TransactionHistoryRow["sourceKind"],
  }));
}

export async function loadTransactionHistoryFilterAccounts(): Promise<
  TransactionHistoryAccountFilterOption[]
> {
  const rows = await loadAccounts();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance ?? 0,
    institution: row.institution ?? null,
  }));
}

export type LinkedLedgerDestination =
  | { kind: "expense"; expenseId: number }
  | { kind: "payablePayment"; paymentId: number; month: string; platform: string }
  | { kind: "receivablePayment"; receivableId: number; paymentId: number }
  | { kind: "lentMoney"; receivableId: number };

export async function resolveLinkedLedgerDestination(
  entry: LedgerEntryActionTarget
): Promise<LinkedLedgerDestination | null> {
  if (entry.linkedExpenseId != null) {
    return { kind: "expense", expenseId: entry.linkedExpenseId };
  }

  if (entry.linkedPayablePaymentId != null) {
    const payment = await payableService.getPaymentTarget(entry.linkedPayablePaymentId);
    if (!payment) return null;
    return {
      kind: "payablePayment",
      paymentId: entry.linkedPayablePaymentId,
      month: payment.month,
      platform: payment.billerName,
    };
  }

  if (entry.linkedReceivablePaymentId != null) {
    const payment = await receivableService.getPayment(entry.linkedReceivablePaymentId);
    if (!payment) return null;
    return {
      kind: "receivablePayment",
      receivableId: payment.receivableId,
      paymentId: entry.linkedReceivablePaymentId,
    };
  }

  if (entry.sourceKind === "LENT_MONEY_ACCOUNT_ENTRY") {
    const receivable = await receivableService.findByLinkedTransactionId(entry.id);
    if (!receivable) return null;
    return {
      kind: "lentMoney",
      receivableId: receivable.id,
    };
  }

  return null;
}
