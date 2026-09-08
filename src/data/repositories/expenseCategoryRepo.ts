import type { Db } from "../db";
import type { ExpenseCategoryRow } from "../types";

export async function findAll(db: Db): Promise<ExpenseCategoryRow[]> {
  return await db.getAllAsync<ExpenseCategoryRow>(
    `SELECT * FROM expense_categories ORDER BY sortOrder ASC, id ASC`
  );
}

export async function findById(db: Db, id: number): Promise<ExpenseCategoryRow | null> {
  return await db.getFirstAsync<ExpenseCategoryRow>(
    `SELECT * FROM expense_categories WHERE id = ?`,
    id
  );
}

export async function findByName(db: Db, name: string): Promise<ExpenseCategoryRow | null> {
  return await db.getFirstAsync<ExpenseCategoryRow>(
    `SELECT * FROM expense_categories WHERE lower(trim(name)) = ? LIMIT 1`,
    name.toLowerCase().trim()
  );
}

export async function findFallbackId(db: Db): Promise<number> {
  const othersRow = await db.getFirstAsync<{ id: number }>(
    `
    SELECT id FROM expense_categories
    WHERE lower(trim(name)) IN ('others', 'other')
    ORDER BY CASE WHEN lower(trim(name)) = 'others' THEN 0 ELSE 1 END, id ASC
    LIMIT 1
    `
  );
  if (othersRow?.id) return othersRow.id;

  const anyRow = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM expense_categories ORDER BY sortOrder ASC, id ASC LIMIT 1`
  );
  if (anyRow?.id) return anyRow.id;

  throw new Error(
    "No expense categories available. Add at least one category before recording payments."
  );
}

export async function insert(db: Db, params: Omit<ExpenseCategoryRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO expense_categories (name, sortOrder, createdAt) VALUES (?, ?, ?)`,
    params.name,
    params.sortOrder,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: { name?: string; sortOrder?: number }
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE expense_categories SET ${sets} WHERE id = ?`, ...values, id);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM expense_categories WHERE id = ?`, id);
}

export async function reorder(db: Db, items: { id: number; sortOrder: number }[]): Promise<void> {
  for (const item of items) {
    await db.runAsync(
      `UPDATE expense_categories SET sortOrder = ? WHERE id = ?`,
      item.sortOrder,
      item.id
    );
  }
}

export async function maxSortOrder(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ maxSort: number | null }>(
    `SELECT MAX(sortOrder) AS maxSort FROM expense_categories`
  );
  return row?.maxSort ?? 0;
}
