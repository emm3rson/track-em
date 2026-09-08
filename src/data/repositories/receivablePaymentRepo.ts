import type { Db } from "../db";
import type { ReceivablePaymentRow, ReceivablePaymentWithAccount } from "../types";

export async function findById(db: Db, id: number): Promise<ReceivablePaymentRow | null> {
  return await db.getFirstAsync<ReceivablePaymentRow>(
    `SELECT * FROM receivable_payments WHERE id = ?`,
    id
  );
}

export async function findByIdWithAccount(
  db: Db,
  id: number
): Promise<(ReceivablePaymentWithAccount & { receivableId: number }) | null> {
  return await db.getFirstAsync<ReceivablePaymentWithAccount & { receivableId: number }>(
    `
    SELECT
      rp.*,
      a.name AS accountName
    FROM receivable_payments rp
    LEFT JOIN accounts a ON a.id = rp.accountId
    WHERE rp.id = ?
    LIMIT 1
    `,
    id
  );
}

export async function findByIdForReceivable(
  db: Db,
  id: number,
  receivableId: number
): Promise<ReceivablePaymentRow | null> {
  return await db.getFirstAsync<ReceivablePaymentRow>(
    `SELECT * FROM receivable_payments WHERE id = ? AND receivableId = ?`,
    id,
    receivableId
  );
}

export async function listByReceivableId(
  db: Db,
  receivableId: number
): Promise<ReceivablePaymentWithAccount[]> {
  return await db.getAllAsync<ReceivablePaymentWithAccount>(
    `
    SELECT
      rp.*,
      a.name AS accountName
    FROM receivable_payments rp
    LEFT JOIN accounts a ON a.id = rp.accountId
    WHERE rp.receivableId = ?
    ORDER BY rp.createdAt DESC, rp.id DESC
    `,
    receivableId
  );
}

export async function sumByReceivableId(db: Db, receivableId: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM receivable_payments WHERE receivableId = ?`,
    receivableId
  );
  return row?.total ?? 0;
}

export async function insert(db: Db, params: Omit<ReceivablePaymentRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO receivable_payments (receivableId, accountId, amount, note, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    params.receivableId,
    params.accountId,
    params.amount,
    params.note,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<ReceivablePaymentRow, "id" | "createdAt" | "receivableId">>
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE receivable_payments SET ${sets} WHERE id = ?`, ...values, id);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM receivable_payments WHERE id = ?`, id);
}

export async function listAllByReceivableId(
  db: Db,
  receivableId: number
): Promise<{ id: number; accountId: number | null }[]> {
  return await db.getAllAsync<{ id: number; accountId: number | null }>(
    `SELECT id, accountId FROM receivable_payments WHERE receivableId = ?`,
    receivableId
  );
}
