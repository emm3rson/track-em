import type { Db } from "../db";
import type { ReceivableRow, ReceivableWithPaid } from "../types";

export async function findAllWithPaid(
  db: Db,
  filters: { archived: 0 | 1; limit?: number; offset?: number }
): Promise<ReceivableWithPaid[]> {
  const values: (string | number)[] = [filters.archived];
  let paginationClause = "";

  if (typeof filters.limit === "number") {
    paginationClause = "LIMIT ? OFFSET ?";
    values.push(filters.limit, filters.offset ?? 0);
  }

  return await db.getAllAsync<ReceivableWithPaid>(
    `
    SELECT
      r.*,
      COALESCE(SUM(rp.amount), 0) AS paidAmount
    FROM receivables r
    LEFT JOIN receivable_payments rp ON rp.receivableId = r.id
    WHERE r.archived = ?
    GROUP BY r.id
    ORDER BY
      CASE
        WHEN r.includeInTotal = 0 THEN 3
        WHEN (r.amount - COALESCE(SUM(rp.amount), 0)) <= 0 THEN 2
        WHEN COALESCE(SUM(rp.amount), 0) > 0 THEN 1
        ELSE 0
      END ASC,
      r.date DESC,
      r.id DESC
    ${paginationClause}
    `,
    ...values
  );
}

export async function findById(db: Db, id: number): Promise<ReceivableRow | null> {
  return await db.getFirstAsync<ReceivableRow>(`SELECT * FROM receivables WHERE id = ?`, id);
}

export async function findByIdWithPaid(db: Db, id: number): Promise<ReceivableWithPaid | null> {
  return await db.getFirstAsync<ReceivableWithPaid>(
    `
    SELECT
      r.*,
      COALESCE(SUM(rp.amount), 0) AS paidAmount
    FROM receivables r
    LEFT JOIN receivable_payments rp ON rp.receivableId = r.id
    WHERE r.id = ?
    GROUP BY r.id
    LIMIT 1
    `,
    id
  );
}

export async function findByLinkedTransactionId(
  db: Db,
  linkedTransactionId: number
): Promise<ReceivableWithPaid | null> {
  return await db.getFirstAsync<ReceivableWithPaid>(
    `
    SELECT
      r.*,
      COALESCE(SUM(rp.amount), 0) AS paidAmount
    FROM receivables r
    LEFT JOIN receivable_payments rp ON rp.receivableId = r.id
    WHERE r.linkedTransactionId = ?
    GROUP BY r.id
    LIMIT 1
    `,
    linkedTransactionId
  );
}

export async function insert(db: Db, params: Omit<ReceivableRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `
    INSERT INTO receivables (
      person, amount, date, note, settled, includeInTotal, archived,
      targetPaymentDate, linkedTransactionId, preferredAccountId, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params.person,
    params.amount,
    params.date,
    params.note,
    params.settled,
    params.includeInTotal,
    params.archived,
    params.targetPaymentDate,
    params.linkedTransactionId,
    params.preferredAccountId,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<ReceivableRow, "id" | "createdAt">>
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE receivables SET ${sets} WHERE id = ?`, ...values, id);
}

export async function setArchived(db: Db, id: number, archived: 0 | 1): Promise<void> {
  await db.runAsync(`UPDATE receivables SET archived = ? WHERE id = ?`, archived, id);
}

export async function setSettled(db: Db, id: number, settled: 0 | 1): Promise<void> {
  await db.runAsync(`UPDATE receivables SET settled = ? WHERE id = ?`, settled, id);
}

export async function deleteById(db: Db, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM receivables WHERE id = ?`, id);
}

export async function sumOwed(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `
    SELECT COALESCE(SUM(CASE WHEN remaining > 0 THEN remaining ELSE 0 END), 0) AS total
    FROM (
      SELECT
        r.amount - COALESCE(SUM(rp.amount), 0) AS remaining
      FROM receivables r
      LEFT JOIN receivable_payments rp ON rp.receivableId = r.id
      WHERE r.includeInTotal = 1 AND r.archived = 0
      GROUP BY r.id
    ) totals
    `
  );
  return row?.total ?? 0;
}

export async function countArchived(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM receivables WHERE archived = 1`
  );
  return row?.total ?? 0;
}

export async function findFullyPaidUnsettled(db: Db): Promise<{ id: number }[]> {
  return await db.getAllAsync<{ id: number }>(
    `
    SELECT r.id
    FROM receivables r
    LEFT JOIN receivable_payments rp ON rp.receivableId = r.id
    WHERE r.archived = 0 AND r.settled = 0
    GROUP BY r.id
    HAVING (r.amount - COALESCE(SUM(rp.amount), 0)) <= 0
    `
  );
}

export async function setIncludeInTotal(db: Db, id: number, includeInTotal: 0 | 1): Promise<void> {
  await db.runAsync(`UPDATE receivables SET includeInTotal = ? WHERE id = ?`, includeInTotal, id);
}
