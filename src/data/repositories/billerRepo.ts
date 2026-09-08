import type { Db } from "../db";
import type { BillerRow } from "../types";

export async function findAll(db: Db): Promise<BillerRow[]> {
  return await db.getAllAsync<BillerRow>(`SELECT * FROM billers ORDER BY name ASC`);
}

export async function findAllActive(db: Db): Promise<BillerRow[]> {
  return await db.getAllAsync<BillerRow>(
    `SELECT * FROM billers WHERE archived = 0 ORDER BY name ASC`
  );
}

export async function findById(db: Db, id: number): Promise<BillerRow | null> {
  return await db.getFirstAsync<BillerRow>(`SELECT * FROM billers WHERE id = ?`, id);
}

export async function findByName(db: Db, name: string): Promise<BillerRow | null> {
  return await db.getFirstAsync<BillerRow>(
    `SELECT * FROM billers WHERE lower(trim(name)) = ? LIMIT 1`,
    name.toLowerCase().trim()
  );
}

export async function insert(db: Db, params: Omit<BillerRow, "id">): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO billers (name, defaultCategoryId, defaultAccountId, archived, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    params.name,
    params.defaultCategoryId,
    params.defaultAccountId,
    params.archived,
    params.createdAt
  );
  return Number(result.lastInsertRowId);
}

export async function update(
  db: Db,
  id: number,
  patch: Partial<Omit<BillerRow, "id" | "createdAt">>
): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const sets = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(`UPDATE billers SET ${sets} WHERE id = ?`, ...values, id);
}

export async function findOrCreate(
  db: Db,
  params: {
    name: string;
    defaultCategoryId?: number | null;
    defaultAccountId?: number | null;
  }
): Promise<number> {
  const existing = await findByName(db, params.name);
  if (existing) return existing.id;

  return await insert(db, {
    name: params.name,
    defaultCategoryId: params.defaultCategoryId ?? null,
    defaultAccountId: params.defaultAccountId ?? null,
    archived: 0,
    createdAt: new Date().toISOString(),
  });
}
