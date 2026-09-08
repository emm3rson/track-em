jest.mock("../getDb", () => ({ getDb: jest.fn() }));
// backupService imports initDb (runtime) from ../db, which pulls expo-sqlite's
// native chain (expo-asset) unavailable under Jest. Mock initDb to a no-op:
// the TestDb harness already creates the full schema + seeds, and restore
// re-inserts all rows before initDb runs, so fidelity assertions are unaffected.
jest.mock("../db", () => ({ initDb: jest.fn() }));
import { getDb } from "../getDb";
import { createTestDb, type TestDb } from "../__tests__/sqliteTestDb";
import {
  buildBackupPayload,
  restoreBackupPayload,
  validateBackupPayload,
  isBackupPayload,
  BACKUP_VERSION,
  type BackupPayload,
} from "./backupService";
import { createAccount } from "./accountService";
import { addExpense } from "./expenseService";
import { createTransfer } from "./transferService";
import { upsertPayable, recordPayablePayment } from "./payableService";
import { logLentMoney, recordPayment } from "./receivableService";

const mockedGetDb = getDb as jest.Mock;

const TABLES = [
  "accounts",
  "transactions",
  "expense_categories",
  "expenses",
  "billers",
  "payables",
  "payable_payments",
  "receivables",
  "receivable_payments",
] as const;

async function getTableCounts(db: TestDb): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}`);
    counts[table] = row?.c ?? 0;
  }
  return counts;
}

async function getCategoryId(db: TestDb): Promise<number> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM expense_categories ORDER BY sortOrder ASC, id ASC LIMIT 1`
  );
  if (!row) throw new Error("Seeded categories missing");
  return row.id;
}

async function seedRichFixture() {
  const activeDb: TestDb = await mockedGetDb();
  const categoryId = await getCategoryId(activeDb);

  const fromId = await createAccount({
    name: "Checking A",
    type: "SOURCE",
    initialBalance: 100000,
  });
  const toId = await createAccount({
    name: "Savings B",
    type: "SAVINGS",
    initialBalance: 50000,
  });

  await addExpense({
    dateIso: "2026-08-10",
    amount: 2500,
    categoryId,
    accountId: fromId,
    note: "groceries",
  });

  const groupId = await createTransfer({
    fromAccountId: fromId,
    toAccountId: toId,
    amount: 5000,
    dateIso: "2026-08-11",
    note: "move",
  });

  const { payableId } = await upsertPayable({
    billerName: "Meralco",
    monthIsoAnchor: "2026-08-01",
    amount: 10000,
    status: "UNPAID",
    categoryId,
    defaultAccountId: fromId,
  });
  await recordPayablePayment({
    payableId,
    amount: 3000,
    accountId: fromId,
    paymentDateIso: "2026-08-12",
  });

  const { receivableId } = await logLentMoney({
    person: "Ana",
    amount: 8000,
    dateIso: "2026-08-13",
    accountId: fromId,
  });
  await recordPayment({
    receivableId,
    amount: 2000,
    accountId: toId,
    person: "Ana",
  });

  return { fromId, toId, categoryId, groupId, payableId, receivableId };
}

function clonePayload(payload: BackupPayload): BackupPayload {
  return JSON.parse(JSON.stringify(payload)) as BackupPayload;
}

describe("backupService integration", () => {
  let db: TestDb;
  let extraDbs: TestDb[];

  beforeEach(async () => {
    db = await createTestDb();
    extraDbs = [];
    mockedGetDb.mockReset();
    mockedGetDb.mockResolvedValue(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // ignore
    }
    for (const extra of extraDbs) {
      try {
        extra.close();
      } catch {
        // ignore
      }
    }
  });

  async function makeFreshDb(): Promise<TestDb> {
    const fresh = await createTestDb();
    extraDbs.push(fresh);
    return fresh;
  }

  it("round-trip fidelity: restore into fresh DB preserves counts, money, and links", async () => {
    const { groupId } = await seedRichFixture();

    const payload = await buildBackupPayload();
    const beforeCounts = await getTableCounts(db);

    // Sanity: rich fixture touches every table except categories seed.
    expect(beforeCounts.accounts).toBe(2);
    expect(beforeCounts.expenses).toBe(2);
    expect(beforeCounts.transactions).toBe(6);
    expect(beforeCounts.billers).toBe(1);
    expect(beforeCounts.payables).toBe(1);
    expect(beforeCounts.payable_payments).toBe(1);
    expect(beforeCounts.receivables).toBe(1);
    expect(beforeCounts.receivable_payments).toBe(1);
    expect(beforeCounts.expense_categories).toBeGreaterThan(0);

    const beforeAccounts = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM accounts ORDER BY id ASC`
    );
    const beforeTransactions = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM transactions ORDER BY id ASC`
    );
    const beforeExpenses = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM expenses ORDER BY id ASC`
    );
    const beforePayables = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM payables ORDER BY id ASC`
    );
    const beforePayablePayments = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM payable_payments ORDER BY id ASC`
    );
    const beforeReceivables = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM receivables ORDER BY id ASC`
    );
    const beforeReceivablePayments = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM receivable_payments ORDER BY id ASC`
    );

    const dest = await makeFreshDb();
    mockedGetDb.mockResolvedValue(dest);
    await restoreBackupPayload(payload);

    const afterCounts = await getTableCounts(dest);
    expect(afterCounts).toEqual(beforeCounts);

    const afterAccounts = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM accounts ORDER BY id ASC`
    );
    const afterTransactions = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM transactions ORDER BY id ASC`
    );
    const afterExpenses = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM expenses ORDER BY id ASC`
    );
    const afterPayables = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM payables ORDER BY id ASC`
    );
    const afterPayablePayments = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM payable_payments ORDER BY id ASC`
    );
    const afterReceivables = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM receivables ORDER BY id ASC`
    );
    const afterReceivablePayments = await dest.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM receivable_payments ORDER BY id ASC`
    );

    // Full row fidelity (covers money fields, ids, linked ids, transferGroupId).
    expect(afterAccounts).toEqual(beforeAccounts);
    expect(afterTransactions).toEqual(beforeTransactions);
    expect(afterExpenses).toEqual(beforeExpenses);
    expect(afterPayables).toEqual(beforePayables);
    expect(afterPayablePayments).toEqual(beforePayablePayments);
    expect(afterReceivables).toEqual(beforeReceivables);
    expect(afterReceivablePayments).toEqual(beforeReceivablePayments);

    // Key money fields identical (explicit).
    expect(afterAccounts.map((r) => r.initialBalance)).toEqual(
      beforeAccounts.map((r) => r.initialBalance)
    );
    expect(afterTransactions.map((r) => r.amount)).toEqual(beforeTransactions.map((r) => r.amount));
    expect(afterExpenses.map((r) => r.amount)).toEqual(beforeExpenses.map((r) => r.amount));
    expect(afterPayables.map((r) => r.amount)).toEqual(beforePayables.map((r) => r.amount));
    expect(afterPayablePayments.map((r) => r.amount)).toEqual(
      beforePayablePayments.map((r) => r.amount)
    );
    expect(afterReceivables.map((r) => r.amount)).toEqual(beforeReceivables.map((r) => r.amount));
    expect(afterReceivablePayments.map((r) => r.amount)).toEqual(
      beforeReceivablePayments.map((r) => r.amount)
    );

    // transferGroupId preserved (both legs share the original group id).
    const transferLegs = afterTransactions.filter((t) => t.transferGroupId === groupId);
    expect(transferLegs).toHaveLength(2);
    expect(new Set(transferLegs.map((t) => t.transferGroupId)).size).toBe(1);

    // Linked ids preserved.
    const payableLinkTx = afterTransactions.filter((t) => t.linkedPayablePaymentId != null);
    expect(payableLinkTx).toHaveLength(1);
    expect(payableLinkTx[0].linkedPayablePaymentId).toBe(
      (afterPayablePayments[0] as { id: number }).id
    );
    const receivableLinkTx = afterTransactions.filter((t) => t.linkedReceivablePaymentId != null);
    expect(receivableLinkTx).toHaveLength(1);
    expect(receivableLinkTx[0].linkedReceivablePaymentId).toBe(
      (afterReceivablePayments[0] as { id: number }).id
    );
    const lentTx = afterTransactions.filter((t) => t.entryKind === "LENT_MONEY_LINK");
    expect(lentTx).toHaveLength(1);
    expect(afterReceivables[0].linkedTransactionId).toBe(lentTx[0].id);

    // FK check passes on restored DB.
    const violations = await dest.getAllAsync(`PRAGMA foreign_key_check;`);
    expect(violations).toHaveLength(0);
  });

  it("payload shape: version, generatedAt, 9 arrays, ordering", async () => {
    await seedRichFixture();
    const payload = await buildBackupPayload();

    expect(BACKUP_VERSION).toBe("3.0");
    expect(payload.backupVersion).toBe("3.0");
    expect(typeof payload.generatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(payload.generatedAt))).toBe(false);
    expect(new Date(payload.generatedAt).toISOString()).toBe(payload.generatedAt);

    const keys = [
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
    for (const key of keys) {
      expect(Array.isArray(payload.data[key])).toBe(true);
    }

    const accountIds = payload.data.accounts.map((a) => a.id);
    expect([...accountIds].sort((a, b) => a - b)).toEqual(accountIds);
    const txIds = payload.data.transactions.map((t) => t.id);
    expect([...txIds].sort((a, b) => a - b)).toEqual(txIds);

    const sortOrders = payload.data.expenseCategories.map((c) => c.sortOrder);
    expect([...sortOrders].sort((a, b) => a - b)).toEqual(sortOrders);
  });

  it.each(["2.0", "9.9"])(
    "version gate: restore with %s throws and leaves DB unchanged",
    async (badVersion) => {
      await seedRichFixture();
      const payload = await buildBackupPayload();
      const beforeCounts = await getTableCounts(db);

      const bad = clonePayload(payload);
      bad.backupVersion = badVersion;

      await expect(restoreBackupPayload(bad)).rejects.toThrow("Unsupported backup version");

      const afterCounts = await getTableCounts(db);
      expect(afterCounts).toEqual(beforeCounts);
    }
  );

  it("malformed payloads: isBackupPayload false, validate throws", async () => {
    expect(isBackupPayload(null)).toBe(false);
    expect(isBackupPayload(undefined)).toBe(false);
    expect(isBackupPayload({})).toBe(false);
    expect(isBackupPayload({ backupVersion: "3.0", generatedAt: "x" })).toBe(false);
    expect(isBackupPayload({ backupVersion: "3.0", generatedAt: "x", data: {} })).toBe(false);
    expect(
      isBackupPayload({
        backupVersion: "3.0",
        generatedAt: new Date().toISOString(),
        data: {
          accounts: [],
          transactions: [],
          expenseCategories: [],
          expenses: [],
          billers: [],
          payables: [],
          payablePayments: [],
          receivables: [],
          // missing receivablePayments
        },
      })
    ).toBe(false);
    expect(
      isBackupPayload({
        backupVersion: "3.0",
        generatedAt: new Date().toISOString(),
        data: {
          accounts: [],
          transactions: [],
          expenseCategories: [],
          expenses: "not-an-array",
          billers: [],
          payables: [],
          payablePayments: [],
          receivables: [],
          receivablePayments: [],
        },
      })
    ).toBe(false);

    expect(() => validateBackupPayload(null)).toThrow("not recognized");
    expect(() => validateBackupPayload({})).toThrow("not recognized");

    await seedRichFixture();
    const payload = await buildBackupPayload();
    expect(isBackupPayload(payload)).toBe(true);
    expect(validateBackupPayload(payload)).toBe(payload);
  });

  it("restore with FK-violating transaction rolls back", async () => {
    await seedRichFixture();
    const payload = await buildBackupPayload();
    const beforeCounts = await getTableCounts(db);

    const bad = clonePayload(payload);
    expect(bad.data.transactions.length).toBeGreaterThan(0);
    bad.data.transactions[0] = {
      ...bad.data.transactions[0],
      accountId: 99999,
    };

    await expect(restoreBackupPayload(bad)).rejects.toThrow();
    const afterCounts = await getTableCounts(db);
    expect(afterCounts).toEqual(beforeCounts);
  });

  it("restore with FK-violating payable rolls back", async () => {
    await seedRichFixture();
    const payload = await buildBackupPayload();
    const beforeCounts = await getTableCounts(db);

    const bad = clonePayload(payload);
    expect(bad.data.payables.length).toBeGreaterThan(0);
    bad.data.payables[0] = {
      ...bad.data.payables[0],
      billerId: 99999,
    };

    await expect(restoreBackupPayload(bad)).rejects.toThrow();
    const afterCounts = await getTableCounts(db);
    expect(afterCounts).toEqual(beforeCounts);
  });

  it("CHECK-constraint violation rolls back and leaves DB untouched", async () => {
    await seedRichFixture();
    const payload = await buildBackupPayload();
    const beforeCounts = await getTableCounts(db);

    const bad = clonePayload(payload);
    expect(bad.data.expenses.length).toBeGreaterThan(0);
    bad.data.expenses[0] = {
      ...bad.data.expenses[0],
      amount: -500,
    };

    await expect(restoreBackupPayload(bad)).rejects.toThrow();
    const afterCounts = await getTableCounts(db);
    expect(afterCounts).toEqual(beforeCounts);
  });

  it("empty-DB round trip works and categories survive", async () => {
    const payload = await buildBackupPayload();
    expect(payload.data.accounts).toHaveLength(0);
    expect(payload.data.expenseCategories.length).toBeGreaterThan(0);

    const dest = await makeFreshDb();
    mockedGetDb.mockResolvedValue(dest);
    await restoreBackupPayload(payload);

    const destCounts = await getTableCounts(dest);
    expect(destCounts.accounts).toBe(0);
    expect(destCounts.transactions).toBe(0);
    expect(destCounts.expenses).toBe(0);
    expect(destCounts.expense_categories).toBe(payload.data.expenseCategories.length);

    const cats = await dest.getAllAsync<{ id: number; name: string }>(
      `SELECT * FROM expense_categories ORDER BY sortOrder ASC, id ASC`
    );
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.map((c) => c.name)).toContain("Others");
  });

  it("post-restore usability: new inserts work", async () => {
    await seedRichFixture();
    const payload = await buildBackupPayload();

    const dest = await makeFreshDb();
    mockedGetDb.mockResolvedValue(dest);
    await restoreBackupPayload(payload);

    const newAccountId = await createAccount({
      name: "Post Restore",
      type: "SOURCE",
      initialBalance: 1000,
    });
    expect(newAccountId).toBeGreaterThan(0);

    const catRow = await dest.getFirstAsync<{ id: number }>(
      `SELECT id FROM expense_categories ORDER BY sortOrder ASC LIMIT 1`
    );
    const expenseId = await addExpense({
      dateIso: "2026-08-20",
      amount: 1234,
      categoryId: catRow!.id,
      accountId: newAccountId,
      note: "after restore",
    });
    expect(expenseId).toBeGreaterThan(0);

    const insertedExpense = await dest.getFirstAsync<{ amount: number }>(
      `SELECT amount FROM expenses WHERE id = ?`,
      expenseId
    );
    expect(insertedExpense?.amount).toBe(1234);
  });

  it("buildBackupPayload with explicit db param works without getDb", async () => {
    await seedRichFixture();

    mockedGetDb.mockImplementation(() => {
      throw new Error("getDb should not be called");
    });

    const payload = await buildBackupPayload(
      db as unknown as Parameters<typeof buildBackupPayload>[0]
    );
    expect(payload.backupVersion).toBe("3.0");
    expect(payload.data.accounts.length).toBe(2);
    expect(payload.data.expenseCategories.length).toBeGreaterThan(0);
  });
});
