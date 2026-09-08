import { getDb } from "../getDb";
import { initDb, type Db } from "../db";
import type {
  AccountRow,
  BillerRow,
  ExpenseCategoryRow,
  ExpenseRow,
  PayablePaymentRow,
  PayableRow,
  ReceivablePaymentRow,
  ReceivableRow,
  TransactionRow,
} from "../types";

export const BACKUP_VERSION = "3.0";

export type BackupPayload = {
  backupVersion: string;
  generatedAt: string;
  data: {
    accounts: AccountRow[];
    transactions: TransactionRow[];
    expenseCategories: ExpenseCategoryRow[];
    expenses: ExpenseRow[];
    billers: BillerRow[];
    payables: PayableRow[];
    payablePayments: PayablePaymentRow[];
    receivables: ReceivableRow[];
    receivablePayments: ReceivablePaymentRow[];
  };
};

export async function buildBackupPayload(dbMaybe?: Db): Promise<BackupPayload> {
  const db = dbMaybe ?? (await getDb());

  let accounts: AccountRow[] = [];
  let transactions: TransactionRow[] = [];
  let expenseCategories: ExpenseCategoryRow[] = [];
  let expenses: ExpenseRow[] = [];
  let billers: BillerRow[] = [];
  let payables: PayableRow[] = [];
  let payablePayments: PayablePaymentRow[] = [];
  let receivables: ReceivableRow[] = [];
  let receivablePayments: ReceivablePaymentRow[] = [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    accounts = await txn.getAllAsync<AccountRow>(`SELECT * FROM accounts ORDER BY id ASC`);
    transactions = await txn.getAllAsync<TransactionRow>(
      `SELECT * FROM transactions ORDER BY id ASC`
    );
    expenseCategories = await txn.getAllAsync<ExpenseCategoryRow>(
      `SELECT * FROM expense_categories ORDER BY sortOrder ASC, id ASC`
    );
    expenses = await txn.getAllAsync<ExpenseRow>(`SELECT * FROM expenses ORDER BY id ASC`);
    billers = await txn.getAllAsync<BillerRow>(`SELECT * FROM billers ORDER BY id ASC`);
    payables = await txn.getAllAsync<PayableRow>(`SELECT * FROM payables ORDER BY id ASC`);
    payablePayments = await txn.getAllAsync<PayablePaymentRow>(
      `SELECT * FROM payable_payments ORDER BY id ASC`
    );
    receivables = await txn.getAllAsync<ReceivableRow>(`SELECT * FROM receivables ORDER BY id ASC`);
    receivablePayments = await txn.getAllAsync<ReceivablePaymentRow>(
      `SELECT * FROM receivable_payments ORDER BY id ASC`
    );
  });

  return {
    backupVersion: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    data: {
      accounts,
      transactions,
      expenseCategories,
      expenses,
      billers,
      payables,
      payablePayments,
      receivables,
      receivablePayments,
    },
  };
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.backupVersion !== "string") return false;
  if (typeof record.generatedAt !== "string") return false;
  if (!record.data || typeof record.data !== "object") return false;

  const data = record.data as Record<string, unknown>;
  const requiredArrays = [
    "accounts",
    "transactions",
    "expenseCategories",
    "expenses",
    "billers",
    "payables",
    "payablePayments",
    "receivables",
    "receivablePayments",
  ] as const;
  return requiredArrays.every((key) => Array.isArray(data[key]));
}

export function validateBackupPayload(value: unknown): BackupPayload {
  if (!isBackupPayload(value)) {
    throw new Error("File format not recognized as a TrackEm backup.");
  }
  return value;
}

export async function restoreBackupPayload(payload: BackupPayload, dbMaybe?: Db) {
  if (payload.backupVersion !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version: ${payload.backupVersion}. Only version ${BACKUP_VERSION} is supported.`
    );
  }

  const {
    accounts,
    transactions,
    expenseCategories,
    expenses,
    billers,
    payables,
    payablePayments,
    receivables,
    receivablePayments,
  } = payload.data;

  const db = dbMaybe ?? (await getDb());
  await db.execAsync("PRAGMA foreign_keys = OFF;");
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    // Clear all tables in safe order
    await db.execAsync(`
      DELETE FROM payable_payments;
      DELETE FROM receivable_payments;
      DELETE FROM transactions;
      DELETE FROM expenses;
      DELETE FROM payables;
      DELETE FROM billers;
      DELETE FROM expense_categories;
      DELETE FROM receivables;
      DELETE FROM accounts;
    `);

    for (const cat of expenseCategories) {
      await db.runAsync(
        `INSERT INTO expense_categories (id, name, sortOrder, createdAt) VALUES (?, ?, ?, ?)`,
        cat.id,
        cat.name,
        cat.sortOrder,
        cat.createdAt
      );
    }

    for (const acc of accounts) {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, institution, initialBalance, goalAmount, accountCategory, includeInTotals, archived, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        acc.id,
        acc.name,
        acc.type,
        acc.institution,
        acc.initialBalance,
        acc.goalAmount,
        acc.accountCategory,
        acc.includeInTotals,
        acc.archived,
        acc.createdAt
      );
    }

    for (const b of billers) {
      await db.runAsync(
        `INSERT INTO billers (id, name, defaultCategoryId, defaultAccountId, archived, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        b.id,
        b.name,
        b.defaultCategoryId,
        b.defaultAccountId,
        b.archived,
        b.createdAt
      );
    }

    for (const exp of expenses) {
      await db.runAsync(
        `INSERT INTO expenses (id, date, amount, categoryId, accountId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        exp.id,
        exp.date,
        exp.amount,
        exp.categoryId,
        exp.accountId,
        exp.note,
        exp.createdAt
      );
    }

    for (const p of payables) {
      await db.runAsync(
        `INSERT INTO payables (id, billerId, month, dueDate, amount, status, categoryId, archived, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        p.billerId,
        p.month,
        p.dueDate,
        p.amount,
        p.status,
        p.categoryId,
        p.archived,
        p.createdAt
      );
    }

    for (const r of receivables) {
      await db.runAsync(
        `INSERT INTO receivables (id, person, amount, date, note, settled, includeInTotal, archived, targetPaymentDate, linkedTransactionId, preferredAccountId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id,
        r.person,
        r.amount,
        r.date,
        r.note,
        r.settled,
        r.includeInTotal,
        r.archived,
        r.targetPaymentDate,
        r.linkedTransactionId,
        r.preferredAccountId,
        r.createdAt
      );
    }

    for (const tx of transactions) {
      await db.runAsync(
        `INSERT INTO transactions (id, accountId, date, amount, entryKind, linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId, transferGroupId, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.id,
        tx.accountId,
        tx.date,
        tx.amount,
        tx.entryKind,
        tx.linkedExpenseId,
        tx.linkedReceivablePaymentId,
        tx.linkedPayablePaymentId,
        tx.transferGroupId,
        tx.note,
        tx.createdAt
      );
    }

    for (const pp of payablePayments) {
      await db.runAsync(
        `INSERT INTO payable_payments (id, payableId, accountId, expenseId, amount, paidAt, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        pp.id,
        pp.payableId,
        pp.accountId,
        pp.expenseId,
        pp.amount,
        pp.paidAt,
        pp.note,
        pp.createdAt
      );
    }

    for (const rp of receivablePayments) {
      await db.runAsync(
        `INSERT INTO receivable_payments (id, receivableId, accountId, amount, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        rp.id,
        rp.receivableId,
        rp.accountId,
        rp.amount,
        rp.note,
        rp.createdAt
      );
    }

    const fkViolations = await db.getAllAsync<{ table: string; rowid: number }>(
      `PRAGMA foreign_key_check;`
    );
    if (fkViolations.length > 0) {
      throw new Error(
        `Backup restore failed foreign-key check (${fkViolations.length} violation(s)).`
      );
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  } finally {
    await db.execAsync("PRAGMA foreign_keys = ON;");
  }

  await initDb(db);
}
