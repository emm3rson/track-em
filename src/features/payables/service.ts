import { addMonths, isoMonthAnchor, monthStart } from "../../utils/dates";
import { accountService, fromCents, payableService, toCents } from "../../data";

import type {
  CreditRow,
  PayablePaymentAccountRow,
  PayablePaymentRow,
  PayablesSnapshot,
  RecordPayablePaymentInput,
  UpsertPayableInput,
} from "./types";

function computeNextMonthDueDate(
  sourceDueDateIso: string | null | undefined,
  nextMonthIso: string
) {
  if (!sourceDueDateIso) return null;
  const day = Number(sourceDueDateIso.slice(8, 10));
  if (!Number.isFinite(day) || day <= 0) return null;
  const nextMonthDate = new Date(nextMonthIso);
  const maxDay = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate();
  if (day > maxDay) return null;
  return `${nextMonthIso.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

function mapPayableRow(
  row: Awaited<ReturnType<typeof payableService.listPayables>>[number]
): CreditRow {
  return {
    id: row.id,
    platform: row.billerName,
    month: row.month,
    dueDate: row.dueDate,
    amount: fromCents(row.amount ?? 0),
    paidAmount: fromCents(row.paidAmount ?? 0),
    remainingAmount: fromCents(row.remainingAmount ?? 0),
    paymentCount: row.paymentCount ?? 0,
    latestPaidAt: row.latestPaidAt ?? null,
    status: row.displayStatus,
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
    preferredAccountId: row.defaultAccountId ?? null,
  };
}

export async function loadPayableById(id: number): Promise<CreditRow | null> {
  const row = await payableService.getPayableById(id);
  return row ? mapPayableRow(row) : null;
}

function computeAutoArchivedMonths(
  rows: Awaited<ReturnType<typeof payableService.listPayables>>,
  currentMonthAnchor: string
) {
  const fullyPaidMonths = new Set<string>();
  const byMonth = new Map<string, { total: number; remaining: number }>();
  for (const row of rows) {
    const existing = byMonth.get(row.month) ?? { total: 0, remaining: 0 };
    existing.total += row.amount ?? 0;
    existing.remaining += row.remainingAmount ?? 0;
    byMonth.set(row.month, existing);
  }

  for (const month of byMonth.keys()) {
    const summary = byMonth.get(month);
    if (!summary || summary.total === 0 || summary.remaining > 0) continue;
    if (month < currentMonthAnchor) {
      fullyPaidMonths.add(month);
    }
  }

  return Array.from(fullyPaidMonths).sort();
}

async function findPayableId(platform: string, monthIsoAnchor: string) {
  const payment = await payableService.getPaymentByMonthAndBiller(monthIsoAnchor, platform);
  if (payment?.payableId) return payment.payableId;

  const rows = await payableService.listPayables({ month: monthIsoAnchor });
  const payable = rows.find(
    (row) =>
      row.month === monthIsoAnchor &&
      row.billerName.trim().toLowerCase() === platform.trim().toLowerCase()
  );
  return payable?.id ?? null;
}

export async function loadPayablesSnapshot(): Promise<PayablesSnapshot> {
  const currentMonthAnchor = isoMonthAnchor(monthStart(new Date()));
  await payableService.autoArchiveFullyPaidMonths(currentMonthAnchor);

  const [activeRows, archivedRows, statusTotalsRows] = await Promise.all([
    payableService.listPayables({ archived: 0 }),
    payableService.listPayables({ archived: 1 }),
    payableService.listStatusTotalsByMonth(),
  ]);

  const rows = [...activeRows, ...archivedRows].map(mapPayableRow);
  const months = Array.from(new Set(activeRows.map((row) => row.month))).sort();
  const archivedMonths = Array.from(new Set(archivedRows.map((row) => row.month))).sort();
  const autoArchivedMonths = computeAutoArchivedMonths(archivedRows, currentMonthAnchor);
  const statusTotalsByMonth = new Map(
    (statusTotalsRows ?? []).map((row) => [
      row.month,
      { paid: fromCents(row.paid), remaining: fromCents(row.remaining) },
    ])
  );

  return {
    rows,
    months,
    archivedMonths,
    autoArchivedMonths,
    statusTotalsByMonth,
  };
}

export async function addMonth(_monthIsoAnchor: string) {
  // Empty persisted months were intentionally removed in v2.
}

export async function savePayable(input: UpsertPayableInput) {
  await payableService.upsertPayable({
    billerName: input.platform,
    monthIsoAnchor: input.monthIsoAnchor,
    dueDateIso: input.dueDateIso ?? null,
    amount: toCents(input.amount),
    status: input.status,
    categoryId: input.categoryId ?? null,
    defaultAccountId: input.preferredAccountId ?? null,
  });
}

export async function loadPayablePaymentAccounts(): Promise<PayablePaymentAccountRow[]> {
  const rows = await accountService.listEligibleForLink();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution,
    balance: fromCents(row.balance ?? 0),
  }));
}

export async function recordPayablePayment(params: RecordPayablePaymentInput) {
  const payableId = await findPayableId(params.platform, params.monthIsoAnchor);
  if (!payableId) {
    throw new Error("Selected payable could not be found.");
  }

  await payableService.recordPayablePayment({
    payableId,
    amount: toCents(params.amount),
    accountId: params.accountId,
    categoryIdOverride: params.categoryIdOverride ?? null,
    paymentDateIso: params.paymentDateIso ?? new Date().toISOString().slice(0, 10),
  });
}

function mapPayablePaymentRow(
  row: Awaited<ReturnType<typeof payableService.listPayments>>[number]
): PayablePaymentRow {
  return {
    ...row,
    amount: fromCents(row.amount),
  };
}

export async function loadPayablePaymentByEntry(params: {
  platform: string;
  monthIsoAnchor: string;
}) {
  const payment = await payableService.getPaymentByMonthAndBiller(
    params.monthIsoAnchor,
    params.platform
  );
  if (!payment) return null;

  return {
    id: payment.id,
    platform: payment.billerName,
    month: payment.month,
    amount: fromCents(payment.amount),
    note: payment.note ?? null,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt,
    accountId: payment.accountId ?? null,
    accountName: payment.accountName ?? null,
    expenseId: payment.expenseId ?? null,
  };
}

export async function loadPayments(payableId: number): Promise<PayablePaymentRow[]> {
  const rows = await payableService.listPayments(payableId);
  return rows.map(mapPayablePaymentRow);
}

export async function getPayment(paymentId: number): Promise<PayablePaymentRow | null> {
  const row = await payableService.getPayment(paymentId);
  if (!row) return null;
  return mapPayablePaymentRow(row);
}

export async function updatePayment(params: {
  entry: CreditRow;
  paymentId: number;
  amount: number;
  accountId?: number | null;
  categoryIdOverride?: number | null;
  paymentDateIso: string;
  note?: string | null;
}) {
  await payableService.updatePayablePayment({
    paymentId: params.paymentId,
    payableId: params.entry.id,
    amount: toCents(params.amount),
    accountId: params.accountId ?? null,
    categoryIdOverride: params.categoryIdOverride ?? null,
    paymentDateIso: params.paymentDateIso,
    note: params.note ?? null,
  });
}

export async function deletePayment(params: { entry: CreditRow; paymentId: number }) {
  await payableService.deletePayablePayment({
    paymentId: params.paymentId,
    payableId: params.entry.id,
  });
}

export async function deletePayable(platform: string, monthIsoAnchor: string) {
  const payableId = await findPayableId(platform, monthIsoAnchor);
  if (payableId == null) return;
  await payableService.deletePayable(payableId);
}

export async function updatePayableDetails(params: {
  previousPlatform: string;
  monthIsoAnchor: string;
  platform: string;
  dueDateIso?: string | null;
  amount: number;
  categoryId?: number | null;
  preferredAccountId?: number | null;
}) {
  const payableId = await findPayableId(params.previousPlatform, params.monthIsoAnchor);
  if (!payableId) {
    throw new Error("Selected payable could not be found.");
  }

  await payableService.updatePayable({
    payableId,
    billerName: params.platform,
    monthIsoAnchor: params.monthIsoAnchor,
    dueDateIso: params.dueDateIso ?? null,
    amount: toCents(params.amount),
    categoryId: params.categoryId ?? null,
    defaultAccountId: params.preferredAccountId ?? null,
  });
}

export async function duplicatePayableToMonth(params: {
  platform: string;
  targetMonthIsoAnchor: string;
  sourceDueDateIso?: string | null;
  amount: number;
  status: "PAID" | "UNPAID";
  categoryId?: number | null;
  preferredAccountId?: number | null;
  existing?: CreditRow;
}) {
  await savePayable({
    platform: params.platform,
    monthIsoAnchor: params.targetMonthIsoAnchor,
    dueDateIso: computeNextMonthDueDate(params.sourceDueDateIso, params.targetMonthIsoAnchor),
    amount: params.amount,
    status: "UNPAID",
    categoryId: params.categoryId,
    preferredAccountId: params.preferredAccountId,
  });

  return params.targetMonthIsoAnchor;
}

export async function duplicatePayableToNextMonth(params: {
  platform: string;
  monthIsoAnchor: string;
  sourceDueDateIso?: string | null;
  amount: number;
  status: "PAID" | "UNPAID";
  categoryId?: number | null;
  preferredAccountId?: number | null;
  existing?: CreditRow;
}) {
  const nextMonthIso = isoMonthAnchor(addMonths(new Date(params.monthIsoAnchor), 1));
  return duplicatePayableToMonth({
    platform: params.platform,
    targetMonthIsoAnchor: nextMonthIso,
    sourceDueDateIso: params.sourceDueDateIso,
    amount: params.amount,
    status: params.status,
    categoryId: params.categoryId,
    preferredAccountId: params.preferredAccountId,
    existing: params.existing,
  });
}

export async function copyPayableToNextMonthReplace(params: {
  platform: string;
  sourceMonthIso: string;
  sourceDueDateIso?: string | null;
  amount: number;
  status: "PAID" | "UNPAID";
  categoryId?: number | null;
  preferredAccountId?: number | null;
}) {
  const nextMonthIso = isoMonthAnchor(addMonths(new Date(params.sourceMonthIso), 1));
  await savePayable({
    platform: params.platform,
    monthIsoAnchor: nextMonthIso,
    dueDateIso: computeNextMonthDueDate(params.sourceDueDateIso, nextMonthIso),
    amount: params.amount,
    status: "UNPAID",
    categoryId: params.categoryId,
    preferredAccountId: params.preferredAccountId,
  });
  return nextMonthIso;
}

export async function archiveMonth(monthIsoAnchor: string) {
  await payableService.archiveMonth(monthIsoAnchor);
}

export async function restoreMonth(monthIsoAnchor: string) {
  await payableService.restoreMonth(monthIsoAnchor);
}

export async function deletePayablesMonth(monthIsoAnchor: string) {
  await payableService.deleteMonth(monthIsoAnchor);
}
