import type { Db } from "../db";
import type { AccountRow, AccountType, AccountWithBalance } from "../types";

export async function findAllActive(db: Db): Promise<AccountWithBalance[]> {
  return await db.getAllAsync<AccountWithBalance>(`
    SELECT
      a.*,
      (a.initialBalance + COALESCE(SUM(t.amount), 0)) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.accountId = a.id
    WHERE a.archived = 0
    GROUP BY a.id
    ORDER BY a.type, a.name
  `);
}

export async function findAllActiveByType(
  db: Db,
  type: AccountType
): Promise<AccountWithBalance[]> {
  return await db.getAllAsync<AccountWithBalance>(
    `
    SELECT
      a.*,
      (a.initialBalance + COALESCE(SUM(t.amount), 0)) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.accountId = a.id
    WHERE a.archived = 0 AND a.type = ?
    GROUP BY a.id
    ORDER BY a.name
    `,
    type
  );
}

export async function findById(db: Db, id: number): Promise<AccountRow | null> {
  return await db.getFirstAsync<AccountRow>(`SELECT * FROM accounts WHERE id = ?`, id);
}

export async function findActiveById(db: Db, id: number): Promise<AccountWithBalance | null> {
  return await db.getFirstAsync<AccountWithBalance>(
    `
    SELECT
      a.*,
      (a.initialBalance + COALESCE(SUM(t.amount), 0)) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.accountId = a.id
    WHERE a.id = ? AND a.archived = 0
    GROUP BY a.id
    `,
    id
  );
}

export async function findActiveLinkable(
  db: Db,
  id: number
): Promise<{ id: number; name: string; type: AccountType } | null> {
  return await db.getFirstAsync<{ id: number; name: string; type: AccountType }>(
    `
    SELECT id, name, type
    FROM accounts
    WHERE id = ? AND archived = 0 AND includeInTotals = 1
    `,
    id
  );
}

export async function findEligibleForExpense(db: Db): Promise<AccountWithBalance[]> {
  return await db.getAllAsync<AccountWithBalance>(
    `
    SELECT
      a.*,
      (a.initialBalance + COALESCE(SUM(t.amount), 0)) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.accountId = a.id
    WHERE a.archived = 0
      AND a.includeInTotals = 1
      AND (
        a.type = 'SOURCE'
        OR (a.type = 'SAVINGS' AND COALESCE(a.accountCategory, 'SAVINGS') = 'SAVINGS')
      )
    GROUP BY a.id
    ORDER BY a.type, a.name
    `
  );
}

export async function findEligibleForLink(db: Db): Promise<AccountWithBalance[]> {
  return await db.getAllAsync<AccountWithBalance>(
    `
    SELECT
      a.*,
      (a.initialBalance + COALESCE(SUM(t.amount), 0)) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.accountId = a.id
    WHERE a.archived = 0 AND a.includeInTotals = 1
    GROUP BY a.id
    ORDER BY CASE WHEN a.type = 'SOURCE' THEN 0 ELSE 1 END, a.name
    `
  );
}

export async function insert(db: Db, params: Omit<AccountRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO accounts (name, type, institution, initialBalance, goalAmount, accountCategory, includeInTotals, archived, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params.name,
    params.type,
    params.institution,
    params.initialBalance,
    params.goalAmount,
    params.accountCategory,
    params.includeInTotals,
    params.archived,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<AccountRow, "id" | "createdAt">>
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE accounts SET ${sets} WHERE id = ?`, ...values, id);
}

export async function setArchived(db: Db, id: number, archived: 0 | 1): Promise<void> {
  await db.runAsync(`UPDATE accounts SET archived = ? WHERE id = ?`, archived, id);
}

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

export async function computeBalance(db: Db, accountId: number): Promise<number | null> {
  const row = await db.getFirstAsync<{ balance: number }>(
    `
    SELECT a.initialBalance + COALESCE(SUM(t.amount), 0) AS balance
    FROM accounts a
    LEFT JOIN transactions t ON t.accountId = a.id
    WHERE a.id = ?
    GROUP BY a.id
    `,
    accountId
  );
  return row?.balance ?? null;
}
