import * as SQLite from "expo-sqlite";
import { ensureExpenseCategoriesSeeded } from "./seed";
import { runMigrations, type Migration } from "./migrations";

export type Db = SQLite.SQLiteDatabase;

const SCHEMA_BASELINE_VERSION = 1;

const MIGRATIONS: Migration[] = [];

export async function openDb(filename = "finance_tracker_v2.db") {
  const db = await SQLite.openDatabaseAsync(filename);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  return db;
}

export async function initDb(db: Db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await createTables(db);
  await createIndexes(db);
  await createTriggers(db);
  await ensureSchemaBaseline(db);
  await ensureExpenseCategoriesSeeded(db);
  await runMigrations(db, MIGRATIONS);
}

// ─── Tables ──────────────────────────────────────────

async function createTables(db: Db) {
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
}

// ─── Indexes ─────────────────────────────────────────

async function createIndexes(db: Db) {
  await db.execAsync(`
    -- accounts (no extra indexes needed; PK covers id)

    -- transactions
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

    -- unique partial indexes for linked columns
    CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_linkedExpenseId
      ON transactions(linkedExpenseId) WHERE linkedExpenseId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_linkedReceivablePaymentId
      ON transactions(linkedReceivablePaymentId) WHERE linkedReceivablePaymentId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_linkedPayablePaymentId
      ON transactions(linkedPayablePaymentId) WHERE linkedPayablePaymentId IS NOT NULL;

    -- expenses
    CREATE INDEX IF NOT EXISTS idx_expenses_date
      ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_categoryId
      ON expenses(categoryId);
    CREATE INDEX IF NOT EXISTS idx_expenses_accountId
      ON expenses(accountId) WHERE accountId IS NOT NULL;

    -- billers (PK + UNIQUE name covers most queries)

    -- payables
    CREATE INDEX IF NOT EXISTS idx_payables_billerId
      ON payables(billerId);
    CREATE INDEX IF NOT EXISTS idx_payables_month
      ON payables(month);
    CREATE INDEX IF NOT EXISTS idx_payables_status
      ON payables(status);

    -- payable_payments
    CREATE INDEX IF NOT EXISTS idx_payable_payments_payableId
      ON payable_payments(payableId);
    CREATE INDEX IF NOT EXISTS idx_payable_payments_accountId
      ON payable_payments(accountId) WHERE accountId IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_payable_payments_expenseId
      ON payable_payments(expenseId) WHERE expenseId IS NOT NULL;

    -- receivables
    CREATE INDEX IF NOT EXISTS idx_receivables_archived
      ON receivables(archived);
    CREATE INDEX IF NOT EXISTS idx_receivables_settled
      ON receivables(settled);

    -- receivable_payments
    CREATE INDEX IF NOT EXISTS idx_receivable_payments_receivableId
      ON receivable_payments(receivableId);
    CREATE INDEX IF NOT EXISTS idx_receivable_payments_accountId
      ON receivable_payments(accountId) WHERE accountId IS NOT NULL;
  `);
}

// ─── Triggers ────────────────────────────────────────

async function createTriggers(db: Db) {
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

// ─── Schema Baseline ─────────────────────────────────

async function ensureSchemaBaseline(db: Db) {
  const row = (await db.getFirstAsync<Record<string, unknown>>(`PRAGMA user_version;`)) ?? {};
  const version = Number(Object.values(row)[0] ?? 0);
  if (version < SCHEMA_BASELINE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_BASELINE_VERSION};`);
  }
}
