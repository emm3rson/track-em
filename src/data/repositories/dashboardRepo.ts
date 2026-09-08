import type { Db } from "../db";
import type { AccountType } from "../types";
import * as payableRepo from "./payableRepo";

export async function sumBalanceByType(
  db: Db,
  type: AccountType,
  includeInTotals = true
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(a.initialBalance + COALESCE(t.total, 0)), 0) AS total
     FROM accounts a
     LEFT JOIN (SELECT accountId, SUM(amount) AS total FROM transactions GROUP BY accountId) t
       ON t.accountId = a.id
     WHERE a.archived = 0 AND a.type = ? AND a.includeInTotals = ?`,
    type,
    includeInTotals ? 1 : 0
  );
  return row?.total ?? 0;
}

export async function sumOwedReceivables(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `
    SELECT COALESCE(SUM(CASE WHEN remaining > 0 THEN remaining ELSE 0 END), 0) AS total
    FROM (
      SELECT r.amount - COALESCE(SUM(rp.amount), 0) AS remaining
      FROM receivables r
      LEFT JOIN receivable_payments rp ON rp.receivableId = r.id
      WHERE r.includeInTotal = 1 AND r.archived = 0
      GROUP BY r.id
    ) totals
    `
  );
  return row?.total ?? 0;
}

export async function sumAllUnpaidPayables(db: Db): Promise<number> {
  return payableRepo.sumAllUnpaid(db);
}

export async function sumUnpaidPayablesRange(
  db: Db,
  fromMonth: string,
  toMonth: string
): Promise<number> {
  return payableRepo.sumUnpaidByMonthRange(db, fromMonth, toMonth);
}

export async function listUnpaidByMonth(
  db: Db,
  fromMonth: string
): Promise<{ month: string; unpaid: number }[]> {
  return payableRepo.listUnpaidGroupedByMonth(db, fromMonth);
}

export async function findLastPayableMonth(db: Db, fromMonth: string): Promise<string | null> {
  return payableRepo.findLastMonthFrom(db, fromMonth);
}

export async function recentActivity(
  db: Db,
  limit = 5
): Promise<
  {
    id: number;
    date: string;
    amount: number;
    accountId: number;
    accountName: string;
    accountType: AccountType;
    entryKind: string;
    note: string | null;
    createdAt: string;
  }[]
> {
  return await db.getAllAsync(
    `
    SELECT
      t.id, t.date, t.amount,
      a.id AS accountId, a.name AS accountName, a.type AS accountType,
      t.entryKind, t.note, t.createdAt
    FROM transactions t
    JOIN accounts a ON a.id = t.accountId
    ORDER BY t.date DESC, t.createdAt DESC, t.id DESC
    LIMIT ?
    `,
    limit
  );
}
