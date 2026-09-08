import { accountService, receivableService, toCents } from "../../data";
import { saveExpense, loadCategories as loadExpenseCategories } from "../expenses/service";
import { createTransferEntry } from "../cashflow/service";
import { loadPayablesSnapshot, savePayable } from "../payables/service";
import { loadReceivablePaymentAccounts, saveReceivable } from "../receivables/service";
import type { ExpenseCategoryRow } from "../../data/types";

import type {
  EntryAccountOption,
  EntrySaveResult,
  ExpenseEntryInput,
  ExpenseEntryMeta,
  IncomeEntryInput,
  LentMoneyEntryInput,
  PayableEntryInput,
  ReceivableEntryInput,
  TransferEntryInput,
} from "../app/entry/types";

function requireFinitePositiveAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function requireValidIsoDate(dateIso: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`${label} must be in YYYY-MM-DD format.`);
  }
}

function requireValidMonthAnchor(monthIsoAnchor: string) {
  if (!/^\d{4}-\d{2}-01$/.test(monthIsoAnchor)) {
    throw new Error("Month must be in YYYY-MM-01 format.");
  }
}

function normalizeOptionalNote(note: string | null) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

function mapAccountOption(
  row: Awaited<ReturnType<typeof accountService.listActive>>[number]
): EntryAccountOption {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution,
    balance: row.balance / 100,
  };
}

export async function loadExpenseEntryMeta(): Promise<ExpenseEntryMeta> {
  const [categories, accounts] = await Promise.all([
    loadExpenseCategories(),
    accountService.listEligibleForExpense(),
  ]);
  return {
    categories,
    accounts: accounts.map(mapAccountOption),
  };
}

export async function saveExpenseEntry(input: ExpenseEntryInput): Promise<EntrySaveResult> {
  requireValidIsoDate(input.dateIso, "Date");
  requireFinitePositiveAmount(input.amount, "Expense amount");
  if (!Number.isFinite(input.categoryId) || input.categoryId <= 0) {
    throw new Error("Category is required.");
  }

  await saveExpense({
    mode: "add",
    dateIso: input.dateIso,
    amount: Math.abs(input.amount),
    categoryId: input.categoryId,
    accountId: input.accountId,
    note: normalizeOptionalNote(input.note),
  });
  return { ok: true, message: "Expense logged." };
}

export async function loadIncomeAccounts(): Promise<EntryAccountOption[]> {
  const rows = await accountService.listActive();
  return rows
    .filter((row) => row.type === "SOURCE" && row.includeInTotals !== 0)
    .map(mapAccountOption);
}

export async function saveIncomeEntry(input: IncomeEntryInput): Promise<EntrySaveResult> {
  requireValidIsoDate(input.dateIso, "Date");
  requireFinitePositiveAmount(input.amount, "Income amount");

  const rows = await accountService.listActive();
  const account = rows.find(
    (row) => row.id === input.accountId && row.type === "SOURCE" && row.includeInTotals !== 0
  );
  if (!account) {
    throw new Error("Selected income account is no longer available.");
  }

  await accountService.addManualEntry({
    accountId: account.id,
    dateIso: input.dateIso,
    amount: toCents(input.amount),
    note: normalizeOptionalNote(input.note),
  });
  return { ok: true, message: "Income logged." };
}

export async function loadTransferAccounts(): Promise<EntryAccountOption[]> {
  const rows = await accountService.listEligibleForLink();
  return rows.map(mapAccountOption);
}

export async function saveTransferEntry(input: TransferEntryInput): Promise<EntrySaveResult> {
  requireValidIsoDate(input.dateIso, "Date");
  requireFinitePositiveAmount(input.receivedAmount, "Amount received");
  if (!Number.isFinite(input.feeAmount) || input.feeAmount < 0) {
    throw new Error("Convenience fee cannot be negative.");
  }

  const accounts = await loadTransferAccounts();
  if (accounts.length < 2) {
    throw new Error("At least two eligible accounts are required for transfers.");
  }
  const from = accounts.find((row) => row.id === input.fromAccountId);
  const to = accounts.find((row) => row.id === input.toAccountId);

  if (!from) {
    throw new Error("Source account is no longer available.");
  }
  if (!to) {
    throw new Error("Destination account is no longer available.");
  }
  if (from.id === to.id) {
    throw new Error("Source and destination accounts must be different.");
  }

  await createTransferEntry({
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: input.receivedAmount,
    fee: input.feeAmount,
    dateIso: input.dateIso,
    note: normalizeOptionalNote(input.note),
  });

  return { ok: true, message: "Transfer saved." };
}

export async function savePayableEntry(input: PayableEntryInput): Promise<EntrySaveResult> {
  const platform = input.platform.trim();
  if (!platform) {
    throw new Error("Payee name is required.");
  }
  requireFinitePositiveAmount(input.amount, "Payable amount");
  requireValidMonthAnchor(input.monthIsoAnchor);
  const dueDateIso = input.dueDateIso?.trim() ? input.dueDateIso.trim() : null;
  if (dueDateIso) {
    requireValidIsoDate(dueDateIso, "Due date");
    if (dueDateIso.slice(0, 7) !== input.monthIsoAnchor.slice(0, 7)) {
      throw new Error("Due date must be within the selected month.");
    }
  }

  const snapshot = await loadPayablesSnapshot();
  const duplicate = snapshot.rows.find(
    (row) =>
      row.month === input.monthIsoAnchor &&
      row.platform.trim().toLowerCase() === platform.toLowerCase()
  );
  if (duplicate) {
    throw new Error("A payable with this payee already exists for the selected month.");
  }

  await savePayable({
    platform,
    monthIsoAnchor: input.monthIsoAnchor,
    dueDateIso,
    amount: input.amount,
    status: "UNPAID",
    categoryId: input.categoryId ?? null,
    preferredAccountId: input.preferredAccountId ?? null,
  });
  return { ok: true, message: "Payable added." };
}

export async function loadPayableEntryCategories(): Promise<ExpenseCategoryRow[]> {
  return loadExpenseCategories();
}

export async function saveReceivableEntry(input: ReceivableEntryInput): Promise<EntrySaveResult> {
  const person = input.person.trim();
  if (!person) {
    throw new Error("Person is required.");
  }
  requireValidIsoDate(input.dateIso, "Date");
  requireFinitePositiveAmount(input.amount, "Receivable amount");
  if (input.targetPaymentDate) {
    requireValidIsoDate(input.targetPaymentDate, "Target payment date");
  }

  await saveReceivable({
    mode: "add",
    values: {
      person,
      amount: input.amount,
      dateIso: input.dateIso,
      note: normalizeOptionalNote(input.note),
      targetPaymentDate: input.targetPaymentDate,
      preferredAccountId: input.preferredAccountId ?? null,
    },
  });
  return { ok: true, message: "Receivable logged." };
}

export async function loadLentMoneyAccounts(): Promise<EntryAccountOption[]> {
  return loadReceivablePaymentAccounts();
}

export async function saveLentMoneyEntry(input: LentMoneyEntryInput): Promise<EntrySaveResult> {
  const person = input.person.trim();
  if (!person) {
    throw new Error("Person is required.");
  }
  requireValidIsoDate(input.dateIso, "Date");
  requireFinitePositiveAmount(input.amount, "Amount");
  if (input.targetPaymentDate) {
    requireValidIsoDate(input.targetPaymentDate, "Target payment date");
  }
  if (!Number.isFinite(input.accountId) || input.accountId <= 0) {
    throw new Error("Account is required.");
  }

  await receivableService.logLentMoney({
    person,
    amount: toCents(input.amount),
    dateIso: input.dateIso,
    note: normalizeOptionalNote(input.note),
    targetPaymentDate: input.targetPaymentDate,
    accountId: input.accountId,
  });
  return { ok: true, message: "Lent money logged." };
}
