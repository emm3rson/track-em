/**
 * Test-only SQLite harness backed by Node's built-in `node:sqlite`.
 *
 * Production code uses expo-sqlite, whose native module is unavailable in
 * Jest. This adapter implements the small `Db` surface used by `src/data/*`
 * (`getAllAsync` / `getFirstAsync` / `runAsync` / `execAsync` /
 * `withExclusiveTransactionAsync`) on top of an in-memory SQLite database,
 * then runs the real `initDb` schema (tables, indexes, triggers, seeds).
 *
 * Mock `../getDb` (or `../../getDb`, depending on depth) to return the
 * adapter so service/repository code runs unchanged against real SQL
 * semantics: CHECK constraints, foreign keys, triggers, partial unique
 * indexes, and manual BEGIN/COMMIT/ROLLBACK transactions.
 *
 * NOTE: schema SQL is intentionally duplicated from `src/data/db.ts`
 * (rather than importing `initDb`) because `db.ts` imports the expo-sqlite
 * native module, which is unavailable in Jest. Keep the two in sync when
 * the schema changes.
 *
 * Example:
 * ```ts
 * jest.mock("../getDb", () => ({ getDb: jest.fn() }));
 * import { getDb } from "../getDb";
 * import { createTestDb } from "../__tests__/sqliteTestDb";
 *
 * let db: TestDb;
 * beforeEach(async () => {
 *   db = await createTestDb();
 *   (getDb as jest.Mock).mockResolvedValue(db);
 * });
 * afterEach(() => db.close());
 * ```
 */

import type { SQLInputValue } from "node:sqlite";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

export type TestDbRunResult = {
  lastInsertRowId: number;
  changes: number;
};

export type TestDb = {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<TestDbRunResult>;
  execAsync(sql: string): Promise<void>;
  withExclusiveTransactionAsync<T>(fn: (txn: TestDb) => Promise<T>): Promise<T>;
  close(): void;
};

function toPlain<T>(row: T): T {
  if (row === null || typeof row !== "object") return row;
  return { ...(row as Record<string, unknown>) } as T;
}

function normalizeParams(params: unknown[]): SQLInputValue[] {
  // expo-sqlite accepts variadic params; tolerate a single array argument.
  const flat = params.length === 1 && Array.isArray(params[0]) ? (params[0] as unknown[]) : params;
  return flat.map((p) => (p === undefined ? null : p)) as SQLInputValue[];
}

export async function createTestDb(): Promise<TestDb> {
  const raw = new DatabaseSync(":memory:");

  const db = {
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const rows = raw.prepare(sql).all(...normalizeParams(params)) as T[];
      return rows.map(toPlain);
    },
    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      const row = raw.prepare(sql).get(...normalizeParams(params)) as T | undefined;
      return row === undefined ? null : toPlain(row);
    },
    async runAsync(sql: string, ...params: unknown[]): Promise<TestDbRunResult> {
      const result = raw.prepare(sql).run(...normalizeParams(params)) as {
        lastInsertRowid?: number | bigint;
        lastInsertRowId?: number | bigint;
        changes?: number | bigint;
      };
      const lastId = result.lastInsertRowid ?? result.lastInsertRowId ?? 0;
      return {
        lastInsertRowId: Number(lastId),
        changes: Number(result.changes ?? 0),
      };
    },
    async execAsync(sql: string): Promise<void> {
      raw.exec(sql);
    },
    async withExclusiveTransactionAsync<T>(fn: (txn: TestDb) => Promise<T>): Promise<T> {
      return fn(db as TestDb);
    },
    close(): void {
      raw.close();
    },
  } as TestDb;

  // Enforce foreign keys like production `openDb`/`initDb` do.
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await createTestSchema(db);
  await ensureTestSeeds(db);

  return db;
}

const DEFAULT_TEST_CATEGORIES = [
  "Groceries",
  "Dine Out",
  "Utilities and Subscriptions",
  "Transportation",
  "Health & Supplements",
  "Personal Care",
  "Shopping",
  "Others",
];

async function createTestSchema(db: TestDb): Promise<void> {
  // Mirrors createTables/createIndexes/createTriggers in src/data/db.ts.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id              INTEGER PRIMARY KEY NOT NULL,
      name            TEXT    NOT NULL,
      type            TEXT    NOT NULL CHECK (type IN ('SOURCE', 'SAVINGS')),
      institution     TEXT,
      initialBalance  INTEGER NOT NULL DEFAULT 0,
      goalAmount      INTEGER,
      accountCategory TEXT    CHECK (accountCategory IS NULL OR accountCategory IN ('SAVINGS', 'INVESTMENT')),
      includeInTotals INTEGER NOT NULL DEFAULT 1 CHECK (includeInTotals IN (0, 1)),
      archived        INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      createdAt       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id        INTEGER PRIMARY KEY NOT NULL,
      name      TEXT    NOT NULL UNIQUE,
      sortOrder INTEGER NOT NULL,
      createdAt TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY NOT NULL,
      date       TEXT    NOT NULL,
      amount     INTEGER NOT NULL CHECK (amount > 0),
      categoryId INTEGER NOT NULL,
      accountId  INTEGER,
      note       TEXT,
      createdAt  TEXT    NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES expense_categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (accountId)  REFERENCES accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS billers (
      id                INTEGER PRIMARY KEY NOT NULL,
      name              TEXT    NOT NULL UNIQUE,
      defaultCategoryId INTEGER,
      defaultAccountId  INTEGER,
      archived          INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      createdAt         TEXT    NOT NULL,
      FOREIGN KEY (defaultCategoryId) REFERENCES expense_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (defaultAccountId)  REFERENCES accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payables (
      id         INTEGER PRIMARY KEY NOT NULL,
      billerId   INTEGER NOT NULL,
      month      TEXT    NOT NULL,
      dueDate    TEXT,
      amount     INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
      status     TEXT    NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'UNPAID')),
      categoryId INTEGER,
      archived   INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      createdAt  TEXT    NOT NULL,
      UNIQUE (billerId, month),
      FOREIGN KEY (billerId)    REFERENCES billers(id) ON DELETE RESTRICT,
      FOREIGN KEY (categoryId)  REFERENCES expense_categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS receivables (
      id                  INTEGER PRIMARY KEY NOT NULL,
      person              TEXT    NOT NULL,
      amount              INTEGER NOT NULL CHECK (amount > 0),
      date                TEXT    NOT NULL,
      note                TEXT,
      settled             INTEGER NOT NULL DEFAULT 0 CHECK (settled IN (0, 1)),
      includeInTotal      INTEGER NOT NULL DEFAULT 1 CHECK (includeInTotal IN (0, 1)),
      archived            INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      targetPaymentDate   TEXT,
      linkedTransactionId INTEGER,
      preferredAccountId  INTEGER,
      createdAt           TEXT    NOT NULL,
      FOREIGN KEY (linkedTransactionId) REFERENCES transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (preferredAccountId)  REFERENCES accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                         INTEGER PRIMARY KEY NOT NULL,
      accountId                  INTEGER NOT NULL,
      date                       TEXT    NOT NULL,
      amount                     INTEGER NOT NULL,
      entryKind                  TEXT    NOT NULL DEFAULT 'MANUAL'
                                   CHECK (entryKind IN (
                                     'MANUAL', 'RECONCILIATION', 'ADJUSTMENT',
                                     'EXPENSE_LINK', 'RECEIVABLE_PAYMENT_LINK',
                                     'PAYABLE_PAYMENT_LINK', 'LENT_MONEY_LINK'
                                   )),
      linkedExpenseId            INTEGER,
      linkedReceivablePaymentId  INTEGER,
      linkedPayablePaymentId     INTEGER,
      transferGroupId            TEXT,
      note                       TEXT,
      createdAt                  TEXT    NOT NULL,
      FOREIGN KEY (accountId)                 REFERENCES accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (linkedExpenseId)           REFERENCES expenses(id) ON DELETE SET NULL,
      FOREIGN KEY (linkedReceivablePaymentId) REFERENCES receivable_payments(id) ON DELETE SET NULL,
      FOREIGN KEY (linkedPayablePaymentId)    REFERENCES payable_payments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payable_payments (
      id        INTEGER PRIMARY KEY NOT NULL,
      payableId INTEGER NOT NULL,
      accountId INTEGER,
      expenseId INTEGER,
      amount    INTEGER NOT NULL CHECK (amount > 0),
      paidAt    TEXT    NOT NULL,
      note      TEXT,
      createdAt TEXT    NOT NULL,
      FOREIGN KEY (payableId)  REFERENCES payables(id) ON DELETE RESTRICT,
      FOREIGN KEY (accountId)  REFERENCES accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (expenseId)  REFERENCES expenses(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS receivable_payments (
      id           INTEGER PRIMARY KEY NOT NULL,
      receivableId INTEGER NOT NULL,
      accountId    INTEGER,
      amount       INTEGER NOT NULL CHECK (amount > 0),
      note         TEXT,
      createdAt    TEXT    NOT NULL,
      FOREIGN KEY (receivableId) REFERENCES receivables(id) ON DELETE CASCADE,
      FOREIGN KEY (accountId)    REFERENCES accounts(id) ON DELETE SET NULL
    );
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_transactions_accountId
      ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_date_accountId
      ON transactions(date, accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_entryKind
      ON transactions(entryKind);
    CREATE INDEX IF NOT EXISTS idx_transactions_transferGroupId
      ON transactions(transferGroupId) WHERE transferGroupId IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_linkedExpenseId
      ON transactions(linkedExpenseId) WHERE linkedExpenseId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_linkedReceivablePaymentId
      ON transactions(linkedReceivablePaymentId) WHERE linkedReceivablePaymentId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_linkedPayablePaymentId
      ON transactions(linkedPayablePaymentId) WHERE linkedPayablePaymentId IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_expenses_date
      ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_categoryId
      ON expenses(categoryId);
    CREATE INDEX IF NOT EXISTS idx_expenses_accountId
      ON expenses(accountId) WHERE accountId IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_payables_billerId
      ON payables(billerId);
    CREATE INDEX IF NOT EXISTS idx_payables_month
      ON payables(month);
    CREATE INDEX IF NOT EXISTS idx_payables_status
      ON payables(status);

    CREATE INDEX IF NOT EXISTS idx_payable_payments_payableId
      ON payable_payments(payableId);
    CREATE INDEX IF NOT EXISTS idx_payable_payments_accountId
      ON payable_payments(accountId) WHERE accountId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_payable_payments_expenseId
      ON payable_payments(expenseId) WHERE expenseId IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_receivables_archived
      ON receivables(archived);
    CREATE INDEX IF NOT EXISTS idx_receivables_settled
      ON receivables(settled);

    CREATE INDEX IF NOT EXISTS idx_receivable_payments_receivableId
      ON receivable_payments(receivableId);
    CREATE INDEX IF NOT EXISTS idx_receivable_payments_accountId
      ON receivable_payments(accountId) WHERE accountId IS NOT NULL;
  `);

  await db.execAsync(`
    CREATE TRIGGER IF NOT EXISTS trg_transactions_single_link_insert
    BEFORE INSERT ON transactions
    FOR EACH ROW
    WHEN (
      (CASE WHEN NEW.linkedExpenseId IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.linkedReceivablePaymentId IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.linkedPayablePaymentId IS NOT NULL THEN 1 ELSE 0 END)
    ) > 1
    BEGIN
      SELECT RAISE(ABORT, 'transactions may only reference one linked entity');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_transactions_single_link_update
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    WHEN (
      (CASE WHEN NEW.linkedExpenseId IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.linkedReceivablePaymentId IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.linkedPayablePaymentId IS NOT NULL THEN 1 ELSE 0 END)
    ) > 1
    BEGIN
      SELECT RAISE(ABORT, 'transactions may only reference one linked entity');
    END;
  `);
}

async function ensureTestSeeds(db: TestDb): Promise<void> {
  const existing = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM expense_categories ORDER BY sortOrder ASC, id ASC;`
  );
  if (existing.length === 0) {
    const nowIso = new Date().toISOString();
    for (let i = 0; i < DEFAULT_TEST_CATEGORIES.length; i += 1) {
      await db.runAsync(
        `INSERT INTO expense_categories (name, sortOrder, createdAt) VALUES (?, ?, ?)`,
        DEFAULT_TEST_CATEGORIES[i],
        i + 1,
        nowIso
      );
    }
  }
}

/** Insert a minimal linkable account; returns its id. */
export async function insertTestAccount(
  db: TestDb,
  overrides?: {
    name?: string;
    type?: "SOURCE" | "SAVINGS";
    initialBalance?: number;
    includeInTotals?: number;
    archived?: number;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO accounts (name, type, institution, initialBalance, goalAmount, accountCategory, includeInTotals, archived, createdAt)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
    overrides?.name ?? `Account ${Math.random().toString(36).slice(2, 7)}`,
    overrides?.type ?? "SOURCE",
    null,
    overrides?.initialBalance ?? 0,
    overrides?.includeInTotals ?? 1,
    overrides?.archived ?? 0,
    now
  );
  return result.lastInsertRowId;
}

/** Fetch the seeded "Others" fallback category id. */
export async function getFallbackCategoryId(db: TestDb): Promise<number> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM expense_categories WHERE lower(trim(name)) IN ('others', 'other') LIMIT 1`
  );
  if (!row) throw new Error("Seeded expense categories missing in test DB.");
  return row.id;
}
