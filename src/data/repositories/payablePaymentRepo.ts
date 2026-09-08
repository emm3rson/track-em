import type { Db } from "../db";
import type { PayablePaymentRow, PayablePaymentWithDetails } from "../types";

export async function findById(db: Db, id: number): Promise<PayablePaymentRow | null> {
  return await db.getFirstAsync<PayablePaymentRow>(
    `SELECT * FROM payable_payments WHERE id = ?`,
    id
  );
}

export async function findByIdWithDetails(
  db: Db,
  id: number
): Promise<
  | (PayablePaymentWithDetails & {
      payableId: number;
      month: string;
      billerName: string;
      expenseId: number | null;
    })
  | null
> {
  return await db.getFirstAsync<
    PayablePaymentWithDetails & {
      payableId: number;
      month: string;
      billerName: string;
      expenseId: number | null;
    }
  >(
    `
    SELECT
      pp.*,
      a.name AS accountName,
      p.month,
      b.name AS billerName
    FROM payable_payments pp
    JOIN payables p ON p.id = pp.payableId
    JOIN billers b ON b.id = p.billerId
    LEFT JOIN accounts a ON a.id = pp.accountId
    WHERE pp.id = ?
    LIMIT 1
    `,
    id
  );
}

export async function findByExpenseId(
  db: Db,
  expenseId: number
): Promise<PayablePaymentRow | null> {
  return await db.getFirstAsync<PayablePaymentRow>(
    `SELECT * FROM payable_payments WHERE expenseId = ? LIMIT 1`,
    expenseId
  );
}

export async function findByPayableId(
  db: Db,
  payableId: number
): Promise<PayablePaymentRow | null> {
  return await db.getFirstAsync<PayablePaymentRow>(
    `SELECT * FROM payable_payments WHERE payableId = ? ORDER BY paidAt DESC, createdAt DESC, id DESC LIMIT 1`,
    payableId
  );
}

export async function findLatestByPayableId(
  db: Db,
  payableId: number
): Promise<PayablePaymentRow | null> {
  return await findByPayableId(db, payableId);
}

export async function findByIdForPayable(
  db: Db,
  id: number,
  payableId: number
): Promise<PayablePaymentRow | null> {
  return await db.getFirstAsync<PayablePaymentRow>(
    `SELECT * FROM payable_payments WHERE id = ? AND payableId = ?`,
    id,
    payableId
  );
}

export async function listByPayableId(
  db: Db,
  payableId: number
): Promise<PayablePaymentWithDetails[]> {
  return await db.getAllAsync<PayablePaymentWithDetails>(
    `
    SELECT
      pp.*,
      a.name AS accountName
    FROM payable_payments pp
    LEFT JOIN accounts a ON a.id = pp.accountId
    WHERE pp.payableId = ?
    ORDER BY pp.paidAt DESC, pp.createdAt DESC, pp.id DESC
    `,
    payableId
  );
}

export async function listAll(
  db: Db,
  filters?: { month?: string }
): Promise<PayablePaymentWithDetails[]> {
  if (filters?.month) {
    return await db.getAllAsync<PayablePaymentWithDetails>(
      `
      SELECT pp.*, a.name AS accountName
      FROM payable_payments pp
      LEFT JOIN accounts a ON a.id = pp.accountId
      JOIN payables p ON p.id = pp.payableId
      WHERE p.month = ?
      ORDER BY pp.paidAt DESC, pp.createdAt DESC, pp.id DESC
      `,
      filters.month
    );
  }

  return await db.getAllAsync<PayablePaymentWithDetails>(
    `
    SELECT pp.*, a.name AS accountName
    FROM payable_payments pp
    LEFT JOIN accounts a ON a.id = pp.accountId
    ORDER BY pp.paidAt DESC, pp.createdAt DESC, pp.id DESC
    `
  );
}

export async function insert(db: Db, params: Omit<PayablePaymentRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params.payableId,
    params.accountId,
    params.expenseId,
    params.amount,
    params.paidAt,
    params.note,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<PayablePaymentRow, "id" | "createdAt" | "payableId">>
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE payable_payments SET ${sets} WHERE id = ?`, ...values, id);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM payable_payments WHERE id = ?`, id);
}

export async function deleteByPayableId(db: Db, payableId: number): Promise<void> {
  await db.runAsync(`DELETE FROM payable_payments WHERE payableId = ?`, payableId);
}

export async function hasPaymentsForMonth(db: Db, month: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `
    SELECT COUNT(*) AS cnt
    FROM payable_payments pp
    JOIN payables p ON p.id = pp.payableId
    WHERE p.month = ?
    `,
    month
  );
  return (row?.cnt ?? 0) > 0;
}

export async function sumByPayableId(db: Db, payableId: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM payable_payments WHERE payableId = ?`,
    payableId
  );
  return row?.total ?? 0;
}
