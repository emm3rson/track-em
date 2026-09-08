import type { Db } from "./db";

export async function resetAllData(db: Db) {
  const deleteOrder = [
    "payable_payments",
    "receivable_payments",
    "transactions",
    "expenses",
    "payables",
    "billers",
    "expense_categories",
    "receivables",
    "accounts",
  ] as const;

  const foreignKeysRow = await db.getFirstAsync<{ foreign_keys: number }>(`PRAGMA foreign_keys;`);
  const foreignKeysEnabled = (foreignKeysRow?.foreign_keys ?? 1) === 1;
  await db.execAsync(`PRAGMA foreign_keys = OFF;`);
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const existingRows = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table'`
    );
    const existingTables = new Set((existingRows ?? []).map((row) => row.name));

    for (const tableName of deleteOrder) {
      if (!existingTables.has(tableName)) continue;
      await db.execAsync(`DELETE FROM ${tableName};`);
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  } finally {
    await db.execAsync(`PRAGMA foreign_keys = ${foreignKeysEnabled ? "ON" : "OFF"};`);
  }
}
