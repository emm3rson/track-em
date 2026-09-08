import { accountService, fromCents, receivableService, toCents } from "../../data";

import type {
  PaymentRow,
  ReceivablePaymentAccountRow,
  ReceivableRow,
  SaveReceivableInput,
} from "./types";

function mapReceivable(
  row: Awaited<ReturnType<typeof receivableService.listActive>>[number]
): ReceivableRow {
  return {
    ...row,
    amount: fromCents(row.amount),
    paidAmount: fromCents(row.paidAmount ?? 0),
    linkedLedgerEntryId: row.linkedTransactionId ?? null,
  };
}

function mapPayment(
  row: Awaited<ReturnType<typeof receivableService.listPayments>>[number]
): PaymentRow {
  return {
    ...row,
    amount: fromCents(row.amount),
  };
}

export async function loadReceivables() {
  const [rows, archivedCount] = await Promise.all([
    receivableService.listActive(),
    receivableService.countArchived(),
  ]);
  return {
    rows: rows.map(mapReceivable),
    archivedCount,
  };
}

export async function loadReceivableById(id: number): Promise<ReceivableRow | null> {
  const row = await receivableService.getById(id);
  return row ? mapReceivable(row) : null;
}

export async function loadArchivedReceivablesPage(params: { limit: number; offset: number }) {
  const requestLimit = Math.max(1, params.limit);
  const rows = await receivableService.listArchived({
    limit: requestLimit + 1,
    offset: Math.max(0, params.offset),
  });
  return {
    rows: rows.slice(0, requestLimit).map(mapReceivable),
    hasMore: rows.length > requestLimit,
  };
}

export async function loadPayments(receivableId: number): Promise<PaymentRow[]> {
  const rows = await receivableService.listPayments(receivableId);
  return rows.map(mapPayment);
}

export async function loadReceivablePaymentAccounts(): Promise<ReceivablePaymentAccountRow[]> {
  const rows = await accountService.listEligibleForLink();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution,
    balance: fromCents(row.balance ?? 0),
  }));
}

export async function saveReceivable(input: SaveReceivableInput) {
  if (input.mode === "add") {
    await receivableService.createReceivable({
      person: input.values.person,
      amount: toCents(input.values.amount),
      dateIso: input.values.dateIso,
      note: input.values.note ?? null,
      targetPaymentDate: input.values.targetPaymentDate ?? null,
      preferredAccountId: input.values.preferredAccountId ?? null,
    });
    return;
  }

  if (!input.selectedEntry) {
    throw new Error("Selected entry is required when editing a receivable.");
  }

  await receivableService.updateReceivable(input.selectedEntry.id, {
    person: input.values.person,
    amount: toCents(input.values.amount),
    date: input.values.dateIso,
    note: input.values.note ?? null,
    includeInTotal:
      typeof input.values.includeInTotal === "boolean"
        ? input.values.includeInTotal
          ? 1
          : 0
        : undefined,
    targetPaymentDate: input.values.targetPaymentDate,
    preferredAccountId: input.values.preferredAccountId ?? null,
  });
}

export async function recordReceivablePayment(params: {
  entry: ReceivableRow;
  amount: number;
  note?: string;
  accountId?: number | null;
}) {
  await receivableService.recordPayment({
    receivableId: params.entry.id,
    amount: toCents(params.amount),
    note: params.note ?? null,
    accountId: params.accountId,
    person: params.entry.person,
  });
}

export async function updatePayment(params: {
  entry: ReceivableRow;
  paymentId: number;
  amount: number;
  note?: string;
}) {
  await receivableService.updatePayment({
    paymentId: params.paymentId,
    receivableId: params.entry.id,
    amount: toCents(params.amount),
    note: params.note ?? null,
    person: params.entry.person,
  });
}

export async function deletePayment(params: { entry: ReceivableRow; paymentId: number }) {
  await receivableService.deletePayment({
    paymentId: params.paymentId,
    receivableId: params.entry.id,
  });
}

export async function archiveReceivable(receivableId: number) {
  await receivableService.archiveReceivable(receivableId);
}

export async function setReceivableIncludeInTotal(receivableId: number, includeInTotal: 0 | 1) {
  await receivableService.setIncludeInTotal(receivableId, includeInTotal);
}

export async function restoreReceivable(receivableId: number) {
  await receivableService.restoreReceivable(receivableId);
}

export async function deleteReceivableCompletely(receivableId: number) {
  await receivableService.deleteReceivable(receivableId);
}
