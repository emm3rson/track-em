import type { Db } from "../db";
import type { AccountType, TransactionRow } from "../types";

export async function insert(db: Db, params: Omit<TransactionRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `
    INSERT INTO transactions (
      accountId, date, amount, entryKind,
      linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId,
      transferGroupId, note, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params.accountId,
    params.date,
    params.amount,
    params.entryKind,
    params.linkedExpenseId,
    params.linkedReceivablePaymentId,
    params.linkedPayablePaymentId,
    params.transferGroupId,
    params.note,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function findById(db: Db, id: number): Promise<TransactionRow | null> {
  return await db.getFirstAsync<TransactionRow>(`SELECT * FROM transactions WHERE id = ?`, id);
}

export async function update(
  db: Db,
  id: number,
  patch: {
    accountId?: number;
    date?: string;
    amount?: number;
    note?: string | null;
  }
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE transactions SET ${sets} WHERE id = ?`, ...values, id);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, id);
}

// ─── Linked entity lookups ───────────────────────────

export async function findByLinkedExpenseId(
  db: Db,
  expenseId: number
): Promise<TransactionRow | null> {
  return await db.getFirstAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE linkedExpenseId = ? LIMIT 1`,
    expenseId
  );
}

export async function findByLinkedReceivablePaymentId(
  db: Db,
  paymentId: number
): Promise<TransactionRow | null> {
  return await db.getFirstAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE linkedReceivablePaymentId = ? LIMIT 1`,
    paymentId
  );
}

export async function findByLinkedPayablePaymentId(
  db: Db,
  paymentId: number
): Promise<TransactionRow | null> {
  return await db.getFirstAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE linkedPayablePaymentId = ? LIMIT 1`,
    paymentId
  );
}

export async function deleteByLinkedExpenseId(db: Db, expenseId: number): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE linkedExpenseId = ?`, expenseId);
}

export async function deleteByLinkedReceivablePaymentId(db: Db, paymentId: number): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE linkedReceivablePaymentId = ?`, paymentId);
}

export async function deleteByLinkedPayablePaymentId(db: Db, paymentId: number): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE linkedPayablePaymentId = ?`, paymentId);
}

// ─── Transfer group ──────────────────────────────────

export async function findByTransferGroupId(db: Db, groupId: string): Promise<TransactionRow[]> {
  return await db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE transferGroupId = ? ORDER BY id ASC`,
    groupId
  );
}

export async function deleteByTransferGroupId(db: Db, groupId: string): Promise<void> {
  await db.runAsync(`DELETE FROM transactions WHERE transferGroupId = ?`, groupId);
}

// ─── Upsert linked entry ────────────────────────────

type LinkedEntryKind = "EXPENSE_LINK" | "RECEIVABLE_PAYMENT_LINK" | "PAYABLE_PAYMENT_LINK";

function getLinkedColumn(kind: LinkedEntryKind) {
  if (kind === "EXPENSE_LINK") return "linkedExpenseId";
  if (kind === "RECEIVABLE_PAYMENT_LINK") return "linkedReceivablePaymentId";
  return "linkedPayablePaymentId";
}

function getLinkedValues(kind: LinkedEntryKind, linkedId: number) {
  return {
    linkedExpenseId: kind === "EXPENSE_LINK" ? linkedId : null,
    linkedReceivablePaymentId: kind === "RECEIVABLE_PAYMENT_LINK" ? linkedId : null,
    linkedPayablePaymentId: kind === "PAYABLE_PAYMENT_LINK" ? linkedId : null,
  };
}

export async function upsertLinkedEntry(
  db: Db,
  params: {
    accountId: number;
    date: string;
    amount: number;
    note: string | null;
    kind: LinkedEntryKind;
    linkedId: number;
    createdAt?: string;
  }
): Promise<number> {
  const column = getLinkedColumn(params.kind);
  const linked = getLinkedValues(params.kind, params.linkedId);
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM transactions WHERE ${column} = ? LIMIT 1`,
    params.linkedId
  );

  if (existing?.id) {
    await db.runAsync(
      `
      UPDATE transactions
      SET accountId = ?, date = ?, amount = ?,
          linkedExpenseId = ?, linkedReceivablePaymentId = ?, linkedPayablePaymentId = ?,
          entryKind = ?, note = ?
      WHERE id = ?
      `,
      params.accountId,
      params.date,
      params.amount,
      linked.linkedExpenseId,
      linked.linkedReceivablePaymentId,
      linked.linkedPayablePaymentId,
      params.kind,
      params.note,
      existing.id
    );
    return existing.id;
  }

  const createdAt = params.createdAt ?? new Date().toISOString();
  const result = await db.runAsync(
    `
    INSERT INTO transactions (
      accountId, date, amount,
      linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId,
      entryKind, note, transferGroupId, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `,
    params.accountId,
    params.date,
    params.amount,
    linked.linkedExpenseId,
    linked.linkedReceivablePaymentId,
    linked.linkedPayablePaymentId,
    params.kind,
    params.note,
    createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function deleteLinkedEntry(
  db: Db,
  params: { kind: LinkedEntryKind; linkedId: number }
): Promise<void> {
  const column = getLinkedColumn(params.kind);
  await db.runAsync(`DELETE FROM transactions WHERE ${column} = ?`, params.linkedId);
}

// ─── Activity queries ────────────────────────────────

export type ActivityRow = {
  activityKey: string;
  id: number;
  date: string;
  createdAt: string;
  amount: number;
  accountId: number;
  accountName: string;
  accountType: AccountType;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  transferGroupId: string | null;
  linkedTransferId: number | null;
  linkedTransferAccountId: number | null;
  linkedTransferAccountName: string | null;
  linkedTransferAmount: number | null;
  note: string | null;
  sourceKind: string;
};

const ACTIVITY_SELECT = `
  SELECT
    ('tx:' || t.id) AS activityKey,
    t.id, t.date, t.createdAt, t.amount,
    a.id AS accountId, a.name AS accountName, a.type AS accountType,
    t.linkedExpenseId, t.linkedReceivablePaymentId, t.linkedPayablePaymentId,
    t.transferGroupId,
    COALESCE(t2.id, NULL) AS linkedTransferId,
    COALESCE(a2.id, NULL) AS linkedTransferAccountId,
    COALESCE(a2.name, NULL) AS linkedTransferAccountName,
    COALESCE(t2.amount, NULL) AS linkedTransferAmount,
    t.note,
    CASE
      WHEN t.linkedExpenseId IS NOT NULL THEN 'EXPENSE_ACCOUNT_ENTRY'
      WHEN t.linkedReceivablePaymentId IS NOT NULL THEN 'RECEIVABLE_ACCOUNT_ENTRY'
      WHEN t.linkedPayablePaymentId IS NOT NULL THEN 'PAYABLE_ACCOUNT_ENTRY'
      WHEN t.entryKind = 'LENT_MONEY_LINK' THEN 'LENT_MONEY_ACCOUNT_ENTRY'
      WHEN COALESCE(t.entryKind, 'MANUAL') = 'RECONCILIATION' THEN 'RECONCILIATION_ACCOUNT_ENTRY'
      WHEN t.entryKind = 'ADJUSTMENT' THEN 'ADJUSTMENT_ACCOUNT_ENTRY'
      ELSE 'MANUAL_ACCOUNT_ENTRY'
    END AS sourceKind
  FROM transactions t
  JOIN accounts a ON a.id = t.accountId
  LEFT JOIN transactions t2 ON t2.transferGroupId = t.transferGroupId
    AND t2.transferGroupId IS NOT NULL AND t2.id != t.id
  LEFT JOIN accounts a2 ON a2.id = t2.accountId
`;

export async function listAccountActivity(
  db: Db,
  params: {
    accountId?: number | null;
    limit?: number;
    offset?: number;
  }
): Promise<ActivityRow[]> {
  const accountId = params.accountId ?? null;
  const offset = params.offset ?? 0;
  return await db.getAllAsync<ActivityRow>(
    `
    ${ACTIVITY_SELECT}
    WHERE (? IS NULL OR a.id = ?)
      AND (
        ? IS NOT NULL
        OR t.transferGroupId IS NULL
        OR t.id = (SELECT MIN(t3.id) FROM transactions t3 WHERE t3.transferGroupId = t.transferGroupId)
      )
    ORDER BY t.date DESC, t.createdAt DESC, t.id DESC
    LIMIT ? OFFSET ?
    `,
    accountId,
    accountId,
    accountId,
    params.limit ?? 30,
    offset
  );
}

export async function listActivityFiltered(
  db: Db,
  params: {
    accountId?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    limit?: number;
    offset?: number;
  }
): Promise<ActivityRow[]> {
  const accountId = params.accountId ?? null;
  const startDate = params.startDate ?? null;
  const endDate = params.endDate ?? null;
  const offset = params.offset ?? 0;
  return await db.getAllAsync<ActivityRow>(
    `
    ${ACTIVITY_SELECT}
    WHERE (? IS NULL OR a.id = ?)
      AND (? IS NULL OR t.date >= ?)
      AND (? IS NULL OR t.date <= ?)
      AND (
        ? IS NOT NULL
        OR t.transferGroupId IS NULL
        OR t.id = (SELECT MIN(t3.id) FROM transactions t3 WHERE t3.transferGroupId = t.transferGroupId)
      )
    ORDER BY t.date DESC, t.createdAt DESC, t.id DESC
    LIMIT ? OFFSET ?
    `,
    accountId,
    accountId,
    startDate,
    startDate,
    endDate,
    endDate,
    accountId,
    params.limit ?? 30,
    offset
  );
}
