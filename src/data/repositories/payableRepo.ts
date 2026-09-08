import type { Db } from "../db";
import type { PayableRow, PayableStatus, PayableWithBiller } from "../types";

export async function findAllWithBiller(
  db: Db,
  filters?: { archived?: 0 | 1; month?: string }
): Promise<PayableWithBiller[]> {
  let where = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.archived !== undefined) {
    where += " AND p.archived = ?";
    params.push(filters.archived);
  }
  if (filters?.month) {
    where += " AND p.month = ?";
    params.push(filters.month);
  }

  return await db.getAllAsync<PayableWithBiller>(
    `
    SELECT
      p.*,
      b.name AS billerName,
      b.defaultAccountId AS defaultAccountId,
      c.name AS categoryName,
      COALESCE(SUM(pp.amount), 0) AS paidAmount,
      MAX(COALESCE(p.amount - COALESCE(SUM(pp.amount), 0), 0), 0) AS remainingAmount,
      COUNT(pp.id) AS paymentCount,
      MAX(pp.paidAt) AS latestPaidAt,
      CASE
        WHEN COALESCE(SUM(pp.amount), 0) >= COALESCE(p.amount, 0) THEN 'PAID'
        WHEN COALESCE(SUM(pp.amount), 0) > 0 THEN 'PARTIALLY_PAID'
        ELSE 'UNPAID'
      END AS displayStatus
    FROM payables p
    JOIN billers b ON b.id = p.billerId
    LEFT JOIN expense_categories c ON c.id = p.categoryId
    LEFT JOIN payable_payments pp ON pp.payableId = p.id
    ${where}
    GROUP BY p.id
    ORDER BY p.month ASC, b.name ASC
    `,
    ...params
  );
}

export async function findById(db: Db, id: number): Promise<PayableRow | null> {
  return await db.getFirstAsync<PayableRow>(`SELECT * FROM payables WHERE id = ?`, id);
}

export async function findByIdWithBiller(db: Db, id: number): Promise<PayableWithBiller | null> {
  const rows = await db.getAllAsync<PayableWithBiller>(
    `
    SELECT
      p.*,
      b.name AS billerName,
      b.defaultAccountId AS defaultAccountId,
      c.name AS categoryName,
      COALESCE(SUM(pp.amount), 0) AS paidAmount,
      MAX(COALESCE(p.amount - COALESCE(SUM(pp.amount), 0), 0), 0) AS remainingAmount,
      COUNT(pp.id) AS paymentCount,
      MAX(pp.paidAt) AS latestPaidAt,
      CASE
        WHEN COALESCE(SUM(pp.amount), 0) >= COALESCE(p.amount, 0) THEN 'PAID'
        WHEN COALESCE(SUM(pp.amount), 0) > 0 THEN 'PARTIALLY_PAID'
        ELSE 'UNPAID'
      END AS displayStatus
    FROM payables p
    JOIN billers b ON b.id = p.billerId
    LEFT JOIN expense_categories c ON c.id = p.categoryId
    LEFT JOIN payable_payments pp ON pp.payableId = p.id
    WHERE p.id = ?
    GROUP BY p.id
    LIMIT 1
    `,
    id
  );
  return rows[0] ?? null;
}

export async function findByMonthAndBiller(
  db: Db,
  month: string,
  billerName: string
): Promise<PayableWithBiller | null> {
  return await db.getFirstAsync<PayableWithBiller>(
    `
    SELECT
      p.*,
      b.name AS billerName,
      b.defaultAccountId AS defaultAccountId,
      c.name AS categoryName,
      COALESCE(SUM(pp.amount), 0) AS paidAmount,
      MAX(COALESCE(p.amount - COALESCE(SUM(pp.amount), 0), 0), 0) AS remainingAmount,
      COUNT(pp.id) AS paymentCount,
      MAX(pp.paidAt) AS latestPaidAt,
      CASE
        WHEN COALESCE(SUM(pp.amount), 0) >= COALESCE(p.amount, 0) THEN 'PAID'
        WHEN COALESCE(SUM(pp.amount), 0) > 0 THEN 'PARTIALLY_PAID'
        ELSE 'UNPAID'
      END AS displayStatus
    FROM payables p
    JOIN billers b ON b.id = p.billerId
    LEFT JOIN expense_categories c ON c.id = p.categoryId
    LEFT JOIN payable_payments pp ON pp.payableId = p.id
    WHERE p.month = ? AND lower(trim(b.name)) = ?
    GROUP BY p.id
    LIMIT 1
    `,
    month,
    billerName.trim().toLowerCase()
  );
}

export async function upsertByBillerMonth(
  db: Db,
  params: {
    billerId: number;
    month: string;
    dueDate?: string | null;
    amount: number;
    status: PayableStatus;
    categoryId?: number | null;
  }
): Promise<number> {
  const result = await db.runAsync(
    `
    INSERT INTO payables (billerId, month, dueDate, amount, status, categoryId, archived, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    ON CONFLICT(billerId, month) DO UPDATE SET
      dueDate = excluded.dueDate,
      amount = excluded.amount,
      status = excluded.status,
      categoryId = excluded.categoryId
    `,
    params.billerId,
    params.month,
    params.dueDate ?? null,
    params.amount,
    params.status,
    params.categoryId ?? null,
    new Date().toISOString()
  );

  // Return the id of inserted or existing row
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM payables WHERE billerId = ? AND month = ?`,
    params.billerId,
    params.month
  );
  return row?.id ?? Number(result.lastInsertRowId);
}

export async function updateStatus(db: Db, id: number, status: PayableStatus): Promise<void> {
  await db.runAsync(`UPDATE payables SET status = ? WHERE id = ?`, status, id);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<PayableRow, "id" | "createdAt" | "month">> & {
    month?: string;
  }
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE payables SET ${sets} WHERE id = ?`, ...values, id);
}

export async function updateCategoryId(db: Db, id: number, categoryId: number): Promise<void> {
  await db.runAsync(`UPDATE payables SET categoryId = ? WHERE id = ?`, categoryId, id);
}

export async function setArchived(db: Db, id: number, archived: 0 | 1): Promise<void> {
  await db.runAsync(`UPDATE payables SET archived = ? WHERE id = ?`, archived, id);
}

export async function batchSetArchivedByMonth(
  db: Db,
  month: string,
  archived: 0 | 1
): Promise<void> {
  await db.runAsync(`UPDATE payables SET archived = ? WHERE month = ?`, archived, month);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM payables WHERE id = ?`, id);
}

export async function deleteByMonth(db: Db, month: string): Promise<void> {
  await db.runAsync(`DELETE FROM payables WHERE month = ?`, month);
}

export async function sumUnpaidByMonthRange(
  db: Db,
  fromMonth: string,
  toMonth: string
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `
    SELECT COALESCE(SUM(remaining), 0) AS total
    FROM (
      SELECT
        MAX(COALESCE(p.amount - COALESCE(SUM(pp.amount), 0), 0), 0) AS remaining
      FROM payables p
      LEFT JOIN payable_payments pp ON pp.payableId = p.id
      WHERE p.archived = 0 AND p.month >= ? AND p.month <= ?
      GROUP BY p.id
    ) totals
    `,
    fromMonth,
    toMonth
  );
  return row?.total ?? 0;
}

export async function sumAllUnpaid(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `
    SELECT COALESCE(SUM(remaining), 0) AS total
    FROM (
      SELECT
        MAX(COALESCE(p.amount - COALESCE(SUM(pp.amount), 0), 0), 0) AS remaining
      FROM payables p
      LEFT JOIN payable_payments pp ON pp.payableId = p.id
      WHERE p.archived = 0
      GROUP BY p.id
    ) totals
    `
  );
  return row?.total ?? 0;
}

export async function listUnpaidGroupedByMonth(
  db: Db,
  fromMonth: string
): Promise<{ month: string; unpaid: number }[]> {
  return await db.getAllAsync<{ month: string; unpaid: number }>(
    `
    SELECT
      p.month,
      SUM(
        MAX(COALESCE(p.amount - COALESCE(payments.paidAmount, 0), 0), 0)
      ) AS unpaid
    FROM payables p
    LEFT JOIN (
      SELECT payableId, COALESCE(SUM(amount), 0) AS paidAmount
      FROM payable_payments
      GROUP BY payableId
    ) payments ON payments.payableId = p.id
    WHERE p.archived = 0 AND p.month >= ?
    GROUP BY p.month
    ORDER BY p.month ASC
    `,
    fromMonth
  );
}

export async function findLastMonthFrom(db: Db, fromMonth: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ month: string | null }>(
    `SELECT MAX(month) AS month FROM payables WHERE archived = 0 AND month >= ?`,
    fromMonth
  );
  return row?.month ?? null;
}

export async function listStatusTotalsByMonth(
  db: Db
): Promise<{ month: string; paid: number; remaining: number }[]> {
  return await db.getAllAsync<{ month: string; paid: number; remaining: number }>(
    `
    SELECT p.month,
      SUM(COALESCE(payments.paidAmount, 0)) AS paid,
      SUM(MAX(COALESCE(p.amount - COALESCE(payments.paidAmount, 0), 0), 0)) AS remaining
    FROM payables p
    LEFT JOIN (
      SELECT payableId, COALESCE(SUM(amount), 0) AS paidAmount
      FROM payable_payments
      GROUP BY payableId
    ) payments ON payments.payableId = p.id
    WHERE p.archived = 0
    GROUP BY p.month
    ORDER BY p.month ASC
    `
  );
}

export async function listFullyPaidMonths(db: Db, beforeMonth: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ month: string }>(
    `
    SELECT p.month
    FROM payables p
    LEFT JOIN (
      SELECT payableId, COALESCE(SUM(amount), 0) AS paidAmount
      FROM payable_payments
      GROUP BY payableId
    ) payments ON payments.payableId = p.id
    WHERE p.archived = 0 AND p.month < ?
    GROUP BY p.month
    HAVING SUM(
      CASE
        WHEN MAX(COALESCE(p.amount - COALESCE(payments.paidAmount, 0), 0), 0) > 0 THEN 1
        ELSE 0
      END
    ) = 0
    `,
    beforeMonth
  );
  return rows.map((r) => r.month);
}
