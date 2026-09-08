import { accountService, fromCents, toCents } from "../../data";
import { resolveCanonicalInstitutionName } from "./institutionMatching";

import type { AccountRow, BalanceUpdate, ReconcileResult, SaveAccountInput } from "./types";
import type { AccountLedgerRow, AccountLedgerSourceKind } from "../app/accounts/types";

function normalizeAccountRow(
  row: Awaited<ReturnType<typeof accountService.listActive>>[number]
): AccountRow {
  return {
    ...row,
    balance: fromCents(row.balance ?? 0),
    goalAmount: row.goalAmount != null ? fromCents(row.goalAmount) : null,
    accountCategory: row.accountCategory ?? (row.type === "SAVINGS" ? "SAVINGS" : null),
    includeInTotals: row.includeInTotals ?? 1,
  };
}

export async function loadAccounts(): Promise<AccountRow[]> {
  const rows = await accountService.listActive();
  return rows.map(normalizeAccountRow);
}

export async function saveAccount(input: SaveAccountInput) {
  const normalizedName = input.name.trim();
  const normalizedInstitution = resolveCanonicalInstitutionName(input.institution);

  if (input.mode === "add") {
    await accountService.createAccount({
      name: normalizedName,
      type: input.type,
      institution: normalizedInstitution,
      initialBalance: toCents(input.initialBalance),
      goalAmount: input.goalAmount != null ? toCents(input.goalAmount) : null,
      accountCategory: input.type === "SAVINGS" ? input.accountCategory : null,
      includeInTotals: input.includeInTotals,
    });
    return;
  }

  if (!input.accountId) {
    throw new Error("Account id is required when editing an account.");
  }

  if (input.type === "SAVINGS") {
    await accountService.updateAccount(input.accountId, {
      name: normalizedName,
      institution: normalizedInstitution,
      goalAmount: input.goalAmount != null ? toCents(input.goalAmount) : null,
      accountCategory: input.accountCategory,
      includeInTotals: input.includeInTotals,
    });
    return;
  }

  await accountService.updateAccount(input.accountId, {
    name: normalizedName,
    institution: normalizedInstitution,
    includeInTotals: input.includeInTotals,
  });
  await accountService.reconcileBalance({
    accountId: input.accountId,
    desiredBalance: toCents(input.initialBalance),
    dateIso: new Date().toISOString().slice(0, 10),
  });
}

export async function archiveAccount(accountId: number) {
  await accountService.archiveAccount(accountId);
}

export async function setAccountIncludeInTotals(accountId: number, includeInTotals: 0 | 1) {
  await accountService.updateAccount(accountId, { includeInTotals });
}

export async function updateAccountBalance(accountId: number, balance: number) {
  await accountService.reconcileBalance({
    accountId,
    desiredBalance: toCents(balance),
    dateIso: new Date().toISOString().slice(0, 10),
  });
}

export async function updateAccountBalances(updates: BalanceUpdate[]) {
  const dateIso = new Date().toISOString().slice(0, 10);
  for (const update of updates) {
    await accountService.reconcileBalance({
      accountId: update.id,
      desiredBalance: toCents(update.balance),
      dateIso,
    });
  }
}

export async function reconcileSavingsBalance(params: {
  accountId: number;
  actualBalance: number;
  dateIso: string;
}): Promise<ReconcileResult> {
  const result = await accountService.reconcileBalance({
    accountId: params.accountId,
    desiredBalance: toCents(params.actualBalance),
    dateIso: params.dateIso,
  });

  if (result.status === "matched") {
    return { status: "matched", offset: 0 };
  }

  return { status: "reconciled", offset: fromCents(result.offset) };
}

export async function loadAccountLedgerRows(
  accountId: number,
  limit = 40,
  offset = 0
): Promise<AccountLedgerRow[]> {
  const rows = await accountService.getAccountActivity({ accountId, limit, offset });
  return rows.map((row) => ({
    activityKey: row.activityKey,
    id: row.id,
    date: row.date,
    createdAt: row.createdAt,
    amount: fromCents(row.amount),
    accountId: row.accountId,
    accountName: row.accountName,
    note: row.note ?? null,
    linkedExpenseId: row.linkedExpenseId ?? null,
    linkedReceivablePaymentId: row.linkedReceivablePaymentId ?? null,
    linkedPayablePaymentId: row.linkedPayablePaymentId ?? null,
    transferGroupId: row.transferGroupId ?? null,
    linkedTransferId: row.linkedTransferId ?? null,
    linkedTransferAccountId: row.linkedTransferAccountId ?? null,
    linkedTransferAccountName: row.linkedTransferAccountName ?? null,
    linkedTransferAmount:
      row.linkedTransferAmount != null ? fromCents(row.linkedTransferAmount) : null,
    sourceKind: row.sourceKind as AccountLedgerSourceKind,
  }));
}
