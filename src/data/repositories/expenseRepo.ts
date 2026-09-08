import type { Db } from "../db";
import type { ExpenseCategoryTotal, ExpenseRow, ExpenseWithCategory } from "../types";

export async function findById(db: Db, id: number): Promise<ExpenseRow | null> {
  return await db.getFirstAsync<ExpenseRow>(`SELECT * FROM expenses WHERE id = ?`, id);
}

export async function findByIdWithCategory(
  db: Db,
  id: number
): Promise<ExpenseWithCategory | null> {
  return await db.getFirstAsync<ExpenseWithCategory>(
    `
    SELECT
      e.*,
      c.name AS categoryName,
      a.name AS accountName,
      a.type AS accountType
    FROM expenses e
    JOIN expense_categories c ON c.id = e.categoryId
    LEFT JOIN accounts a ON a.id = e.accountId
    WHERE e.id = ?
    LIMIT 1
    `,
    id
  );
}

export async function findByMonth(
  db: Db,
  monthStart: string,
  nextMonth: string
): Promise<ExpenseWithCategory[]> {
  return await db.getAllAsync<ExpenseWithCategory>(
    `
    SELECT
      e.*,
      c.name AS categoryName,
      a.name AS accountName,
      a.type AS accountType
    FROM expenses e
    JOIN expense_categories c ON c.id = e.categoryId
    LEFT JOIN accounts a ON a.id = e.accountId
    WHERE e.date >= ? AND e.date < ?
    ORDER BY e.date DESC, e.id DESC
    `,
    monthStart,
    nextMonth
  );
}

export async function sumByMonthAndCategory(
  db: Db,
  monthStart: string,
  nextMonth: string
): Promise<ExpenseCategoryTotal[]> {
  return await db.getAllAsync<ExpenseCategoryTotal>(
    `
    SELECT c.id AS categoryId, c.name, c.sortOrder, SUM(e.amount) AS total
    FROM expense_categories c
    JOIN expenses e ON e.categoryId = c.id
    WHERE e.date >= ? AND e.date < ?
    GROUP BY c.id
    HAVING total != 0
    ORDER BY c.sortOrder ASC, c.name ASC
    `,
    monthStart,
    nextMonth
  );
}

export async function sumByMonth(db: Db, monthStart: string, nextMonth: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses WHERE date >= ? AND date < ?`,
    monthStart,
    nextMonth
  );
  return row?.total ?? 0;
}

export async function countByCategoryId(db: Db, categoryId: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM expenses WHERE categoryId = ?`,
    categoryId
  );
  return row?.total ?? 0;
}

export async function insert(db: Db, params: Omit<ExpenseRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO expenses (date, amount, categoryId, accountId, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    params.date,
    params.amount,
    params.categoryId,
    params.accountId,
    params.note,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<ExpenseRow, "id" | "createdAt">>
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE expenses SET ${sets} WHERE id = ?`, ...values, id);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, id);
}
