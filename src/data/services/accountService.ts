import { getDb } from "../getDb";
import * as accountRepo from "../repositories/accountRepo";
import * as transactionRepo from "../repositories/transactionRepo";
import type { AccountCategory, AccountType, AccountWithBalance } from "../types";
import { EntryKind } from "../types";

export async function listActive(): Promise<AccountWithBalance[]> {
  const db = await getDb();
  return accountRepo.findAllActive(db);
}

export async function listActiveByType(type: AccountType): Promise<AccountWithBalance[]> {
  const db = await getDb();
  return accountRepo.findAllActiveByType(db, type);
}

export async function listEligibleForExpense(): Promise<AccountWithBalance[]> {
  const db = await getDb();
  return accountRepo.findEligibleForExpense(db);
}

export async function listEligibleForLink(): Promise<AccountWithBalance[]> {
  const db = await getDb();
  return accountRepo.findEligibleForLink(db);
}

export async function createAccount(params: {
  name: string;
  type: AccountType;
  institution?: string | null;
  initialBalance: number;
  goalAmount?: number | null;
  accountCategory?: AccountCategory | null;
  includeInTotals?: 0 | 1;
}): Promise<number> {
  const db = await getDb();
  return accountRepo.insert(db, {
    name: params.name,
    type: params.type,
    institution: params.institution ?? null,
    initialBalance: params.initialBalance,
    goalAmount: params.goalAmount ?? null,
    accountCategory: params.accountCategory ?? null,
    includeInTotals: params.includeInTotals ?? 1,
    archived: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function updateAccount(
  id: number,
  patch: {
    name?: string;
    institution?: string | null;
    initialBalance?: number;
    goalAmount?: number | null;
    accountCategory?: AccountCategory | null;
    includeInTotals?: 0 | 1;
  }
): Promise<void> {
  const db = await getDb();
  await accountRepo.update(db, id, patch);
}

export async function archiveAccount(id: number): Promise<void> {
  const db = await getDb();
  await accountRepo.setArchived(db, id, 1);
}

export async function restoreAccount(id: number): Promise<void> {
  const db = await getDb();
  await accountRepo.setArchived(db, id, 0);
}

export async function reconcileBalance(params: {
  accountId: number;
  desiredBalance: number;
  dateIso: string;
}): Promise<{ status: "matched" } | { status: "adjusted"; offset: number }> {
  const db = await getDb();
  const account = await accountRepo.findActiveById(db, params.accountId);
  if (!account) {
    throw new Error(`Cannot reconcile archived or non-existent account ${params.accountId}`);
  }

  const currentBalance = account.balance;

  const offset = params.desiredBalance - currentBalance;
  if (Math.abs(offset) < 1) {
    return { status: "matched" };
  }

  await transactionRepo.insert(db, {
    accountId: params.accountId,
    date: params.dateIso,
    amount: offset,
    entryKind: EntryKind.RECONCILIATION,
    linkedExpenseId: null,
    linkedReceivablePaymentId: null,
    linkedPayablePaymentId: null,
    transferGroupId: null,
    note: "Balance Reconciliation",
    createdAt: new Date().toISOString(),
  });

  return { status: "adjusted", offset };
}

export async function addManualEntry(params: {
  accountId: number;
  dateIso: string;
  amount: number;
  note?: string | null;
  entryKind?: "MANUAL" | "RECONCILIATION";
}): Promise<void> {
  const db = await getDb();
  const account = await accountRepo.findActiveById(db, params.accountId);
  if (!account) {
    throw new Error("Cannot add transaction to an archived or non-existent account.");
  }

  await transactionRepo.insert(db, {
    accountId: params.accountId,
    date: params.dateIso,
    amount: params.amount,
    entryKind: params.entryKind ?? EntryKind.MANUAL,
    linkedExpenseId: null,
    linkedReceivablePaymentId: null,
    linkedPayablePaymentId: null,
    transferGroupId: null,
    note: params.note ?? null,
    createdAt: new Date().toISOString(),
  });
}

export async function updateTransaction(params: {
  id: number;
  accountId?: number;
  dateIso: string;
  amount: number;
  note?: string | null;
}): Promise<void> {
  const db = await getDb();
  const existing = await transactionRepo.findById(db, params.id);
  if (!existing) throw new Error("Transaction not found.");
  assertDirectlyMutable(existing);

  const sourceAccount = await accountRepo.findById(db, existing.accountId);
  if (!sourceAccount || sourceAccount.archived === 1) {
    throw new Error("Cannot edit a transaction in an archived account.");
  }

  if (params.accountId != null) {
    const account = await accountRepo.findActiveById(db, params.accountId);
    if (!account) {
      throw new Error("Cannot move transaction to an archived or non-existent account.");
    }
  }

  await transactionRepo.update(db, params.id, {
    accountId: params.accountId,
    date: params.dateIso,
    amount: params.amount,
    note: params.note ?? null,
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  const existing = await transactionRepo.findById(db, id);
  if (!existing) return;
  assertDirectlyMutable(existing);

  const sourceAccount = await accountRepo.findById(db, existing.accountId);
  if (!sourceAccount || sourceAccount.archived === 1) {
    throw new Error("Cannot delete a transaction in an archived account.");
  }

  await transactionRepo.deleteById(db, id);
}

function assertDirectlyMutable(existing: {
  transferGroupId: string | null;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  entryKind: string;
}): void {
  if (existing.transferGroupId != null) {
    throw new Error("Transfer transactions cannot be changed individually.");
  }
  if (existing.linkedExpenseId != null) {
    throw new Error("Expense-linked transactions can only be changed from Monthly Expenses.");
  }
  if (existing.linkedReceivablePaymentId != null) {
    throw new Error("Receivable-linked transactions can only be changed from Receivables.");
  }
  if (existing.linkedPayablePaymentId != null) {
    throw new Error("Payable-linked transactions can only be changed from Payables.");
  }
  if (existing.entryKind === "LENT_MONEY_LINK") {
    throw new Error("Lent money transactions can only be changed from Receivables.");
  }
  if (existing.entryKind === "RECONCILIATION") {
    throw new Error(
      "Reconciliation entries cannot be changed directly. Reconcile the account again to adjust."
    );
  }
}

export async function getTransaction(id: number) {
  const db = await getDb();
  return transactionRepo.findById(db, id);
}

export async function getAccountActivity(params: {
  accountId?: number | null;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  return transactionRepo.listAccountActivity(db, params);
}

export async function getFilteredActivity(params: {
  accountId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  return transactionRepo.listActivityFiltered(db, params);
}
