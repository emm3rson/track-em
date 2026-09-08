/**
 * Direct `verify(db)` regression coverage for every invariant code.
 *
 * Strategy notes (node:sqlite 3.53.1, verified by probe before writing):
 * - `PRAGMA ignore_check_constraints=ON` IS honored, so NON_POSITIVE_* rows
 *   are seeded with checks off, then the pragma is turned back OFF before
 *   calling verify. A companion test asserts the CHECK constraints still
 *   block the same inserts on the normal path.
 * - `PRAGMA foreign_keys=OFF` IS honored, so all ORPHAN_* rows are seeded
 *   with FK enforcement off, then restored to ON before verify.
 * - The single-link trigger fires regardless of the FK pragma, so
 *   MULTI_LINKED_TRANSACTIONS is seeded by dropping
 *   `trg_transactions_single_link_insert` first (fresh in-memory DB per
 *   test, trigger recreated for hygiene). A companion test asserts the
 *   trigger still aborts normal multi-link inserts.
 * - The three DUPLICATE_* unique partial indexes cannot be violated without
 *   dropping the index, so those tests assert the second insert throws and
 *   verify stays clean (per task brief).
 */
// integrityService imports getDb (value import) which chains to expo-sqlite's
// native module unavailable in Jest; mock it so the suite loads. verify() is
// always called with an explicit TestDb, so the mock is never exercised.
jest.mock("../getDb", () => ({ getDb: jest.fn() }));
import type { Db } from "../db";
import {
  createTestDb,
  getFallbackCategoryId,
  insertTestAccount,
  type TestDb,
} from "../__tests__/sqliteTestDb";
import { verify } from "./integrityService";

let db: TestDb;
let categoryId: number;

beforeEach(async () => {
  db = await createTestDb();
  categoryId = await getFallbackCategoryId(db);
});

afterEach(() => {
  db.close();
});

function asDb(testDb: TestDb): Db {
  return testDb as unknown as Db;
}

async function issueCount(db: TestDb, code: string): Promise<number> {
  const report = await verify(asDb(db));
  return report.issues.find((issue) => issue.code === code)?.count ?? 0;
}

async function withForeignKeysOff(fn: () => Promise<void>): Promise<void> {
  await db.execAsync(`PRAGMA foreign_keys = OFF;`);
  try {
    await fn();
  } finally {
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
  }
}

async function withCheckConstraintsOff(fn: () => Promise<void>): Promise<void> {
  await db.execAsync(`PRAGMA ignore_check_constraints = ON;`);
  try {
    await fn();
  } finally {
    await db.execAsync(`PRAGMA ignore_check_constraints = OFF;`);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

async function seedBiller(name: string): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO billers (name, defaultCategoryId, defaultAccountId, archived, createdAt)
     VALUES (?, NULL, NULL, 0, ?)`,
    name,
    nowIso()
  );
  return result.lastInsertRowId;
}

async function seedPayable(params: {
  billerId: number;
  month?: string;
  dueDate?: string | null;
  amount?: number;
  status?: "PAID" | "UNPAID";
}): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO payables (billerId, month, dueDate, amount, status, categoryId, archived, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    params.billerId,
    params.month ?? "2026-05-01",
    params.dueDate ?? null,
    params.amount ?? 10000,
    params.status ?? "UNPAID",
    categoryId,
    nowIso()
  );
  return result.lastInsertRowId;
}

async function seedExpense(params?: { amount?: number; categoryId?: number }): Promise<number> {
  const accountId = await insertTestAccount(db);
  const result = await db.runAsync(
    `INSERT INTO expenses (date, amount, categoryId, accountId, note, createdAt)
     VALUES ('2026-05-01', ?, ?, ?, NULL, ?)`,
    params?.amount ?? 1000,
    params?.categoryId ?? categoryId,
    accountId,
    nowIso()
  );
  return result.lastInsertRowId;
}

async function seedReceivablePayment(params?: { amount?: number }): Promise<number> {
  const receivable = await db.runAsync(
    `INSERT INTO receivables (person, amount, date, note, settled, includeInTotal, archived,
       targetPaymentDate, linkedTransactionId, preferredAccountId, createdAt)
     VALUES ('Ana', 10000, '2026-05-01', NULL, 0, 1, 0, NULL, NULL, NULL, ?)`,
    nowIso()
  );
  const payment = await db.runAsync(
    `INSERT INTO receivable_payments (receivableId, accountId, amount, note, createdAt)
     VALUES (?, NULL, ?, NULL, ?)`,
    receivable.lastInsertRowId,
    params?.amount ?? 1000,
    nowIso()
  );
  return payment.lastInsertRowId;
}

async function seedPayablePayment(params?: {
  payableId?: number;
  amount?: number;
  accountId?: number | null;
  expenseId?: number | null;
}): Promise<number> {
  let payableId = params?.payableId;
  if (payableId == null) {
    payableId = await seedPayable({ billerId: await seedBiller("Seed Biller") });
  }
  const result = await db.runAsync(
    `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
     VALUES (?, ?, ?, ?, '2026-05-10', NULL, ?)`,
    payableId,
    params?.accountId ?? null,
    params?.expenseId ?? null,
    params?.amount ?? 1000,
    nowIso()
  );
  return result.lastInsertRowId;
}

async function seedTransaction(params: {
  accountId: number;
  linkedExpenseId?: number | null;
  linkedReceivablePaymentId?: number | null;
  linkedPayablePaymentId?: number | null;
  entryKind?: string;
}): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO transactions (accountId, date, amount, entryKind,
       linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId,
       transferGroupId, note, createdAt)
     VALUES (?, '2026-05-01', -1000, ?, ?, ?, ?, NULL, NULL, ?)`,
    params.accountId,
    params.entryKind ?? "MANUAL",
    params.linkedExpenseId ?? null,
    params.linkedReceivablePaymentId ?? null,
    params.linkedPayablePaymentId ?? null,
    nowIso()
  );
  return result.lastInsertRowId;
}

describe("clean database", () => {
  it("reports ok:true with no issues on a fresh seeded DB", async () => {
    const report = await verify(asDb(db));
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });
});

describe("MULTI_LINKED_TRANSACTIONS", () => {
  it("trigger blocks a normal insert linking two entities", async () => {
    const accountId = await insertTestAccount(db);
    const expenseId = await seedExpense();
    const receivablePaymentId = await seedReceivablePayment();

    await expect(
      seedTransaction({
        accountId,
        linkedExpenseId: expenseId,
        linkedReceivablePaymentId: receivablePaymentId,
      })
    ).rejects.toThrow("transactions may only reference one linked entity");

    // Blocked write leaves nothing for verify to flag.
    const report = await verify(asDb(db));
    expect(report.ok).toBe(true);
  });

  it("verify detects a pre-existing multi-linked row (seeded with trigger dropped + FKs off)", async () => {
    const accountId = await insertTestAccount(db);
    await db.execAsync(`DROP TRIGGER IF EXISTS trg_transactions_single_link_insert;`);
    await withForeignKeysOff(async () => {
      // Dangling link ids are intentional: with FKs off the row persists so
      // verify can flag it; production code could never create it via services.
      await seedTransaction({
        accountId,
        linkedExpenseId: 9001,
        linkedReceivablePaymentId: 9002,
      });
    });
    // Recreate the dropped trigger for hygiene (this DB is discarded after the test).
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
    `);

    expect(await issueCount(db, "MULTI_LINKED_TRANSACTIONS")).toBe(1);
  });
});

describe("NON_POSITIVE_* amounts", () => {
  it("CHECK constraints block non-positive inserts on the normal path", async () => {
    const accountId = await insertTestAccount(db);
    await expect(
      db.runAsync(
        `INSERT INTO expenses (date, amount, categoryId, accountId, note, createdAt)
         VALUES ('2026-05-01', 0, ?, ?, NULL, ?)`,
        categoryId,
        accountId,
        nowIso()
      )
    ).rejects.toThrow(/CHECK constraint failed/i);

    const receivable = await db.runAsync(
      `INSERT INTO receivables (person, amount, date, note, settled, includeInTotal, archived,
         targetPaymentDate, linkedTransactionId, preferredAccountId, createdAt)
       VALUES ('Ana', 10000, '2026-05-01', NULL, 0, 1, 0, NULL, NULL, NULL, ?)`,
      nowIso()
    );
    await expect(
      db.runAsync(
        `INSERT INTO receivable_payments (receivableId, accountId, amount, note, createdAt)
         VALUES (?, NULL, -5, NULL, ?)`,
        receivable.lastInsertRowId,
        nowIso()
      )
    ).rejects.toThrow(/CHECK constraint failed/i);

    const payableId = await seedPayable({ billerId: await seedBiller("Check Biller") });
    await expect(
      db.runAsync(
        `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
         VALUES (?, NULL, NULL, 0, '2026-05-10', NULL, ?)`,
        payableId,
        nowIso()
      )
    ).rejects.toThrow(/CHECK constraint failed/i);
  });

  it("verify detects pre-existing non-positive rows seeded with PRAGMA ignore_check_constraints=ON", async () => {
    const accountId = await insertTestAccount(db);
    await withCheckConstraintsOff(async () => {
      await db.runAsync(
        `INSERT INTO expenses (date, amount, categoryId, accountId, note, createdAt)
         VALUES ('2026-05-01', 0, ?, ?, NULL, ?)`,
        categoryId,
        accountId,
        nowIso()
      );
      const receivable = await db.runAsync(
        `INSERT INTO receivables (person, amount, date, note, settled, includeInTotal, archived,
           targetPaymentDate, linkedTransactionId, preferredAccountId, createdAt)
         VALUES ('Ana', 10000, '2026-05-01', NULL, 0, 1, 0, NULL, NULL, NULL, ?)`,
        nowIso()
      );
      await db.runAsync(
        `INSERT INTO receivable_payments (receivableId, accountId, amount, note, createdAt)
         VALUES (?, NULL, -5, NULL, ?)`,
        receivable.lastInsertRowId,
        nowIso()
      );
      const payableId = await seedPayable({ billerId: await seedBiller("Bad Amount Biller") });
      await db.runAsync(
        `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
         VALUES (?, NULL, NULL, 0, '2026-05-10', NULL, ?)`,
        payableId,
        nowIso()
      );
    });

    const report = await verify(asDb(db));
    expect(report.ok).toBe(false);
    expect(await issueCount(db, "NON_POSITIVE_EXPENSE_AMOUNTS")).toBe(1);
    expect(await issueCount(db, "NON_POSITIVE_RECEIVABLE_PAYMENTS")).toBe(1);
    expect(await issueCount(db, "NON_POSITIVE_PAYABLE_PAYMENTS")).toBe(1);
  });
});

describe("orphan links", () => {
  it("flags ORPHAN_TRANSACTIONS for a transaction with a missing account (FKs off)", async () => {
    await withForeignKeysOff(async () => {
      await db.runAsync(
        `INSERT INTO transactions (accountId, date, amount, entryKind,
           linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId,
           transferGroupId, note, createdAt)
         VALUES (999999, '2026-05-01', 100, 'MANUAL', NULL, NULL, NULL, NULL, NULL, ?)`,
        nowIso()
      );
    });
    expect(await issueCount(db, "ORPHAN_TRANSACTIONS")).toBe(1);
  });

  it("flags ORPHAN_RECEIVABLE_PAYMENTS for a payment with a missing receivable (FKs off)", async () => {
    await withForeignKeysOff(async () => {
      await db.runAsync(
        `INSERT INTO receivable_payments (receivableId, accountId, amount, note, createdAt)
         VALUES (999999, NULL, 1000, NULL, ?)`,
        nowIso()
      );
    });
    expect(await issueCount(db, "ORPHAN_RECEIVABLE_PAYMENTS")).toBe(1);
  });

  it("flags ORPHAN_PAYABLE_PAYMENTS for a payment with a missing payable (FKs off)", async () => {
    await withForeignKeysOff(async () => {
      await db.runAsync(
        `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
         VALUES (999999, NULL, NULL, 1000, '2026-05-10', NULL, ?)`,
        nowIso()
      );
    });
    const report = await verify(asDb(db));
    expect(report.issues.find((i) => i.code === "ORPHAN_PAYABLE_PAYMENTS")?.count).toBe(1);
    // Nullable link columns left NULL so no companion link codes fire.
    expect(report.issues.find((i) => i.code === "ORPHAN_PAYABLE_ACCOUNT_LINKS")).toBeUndefined();
    expect(report.issues.find((i) => i.code === "ORPHAN_PAYABLE_EXPENSE_LINKS")).toBeUndefined();
  });

  it("flags ORPHAN_PAYABLE_ACCOUNT_LINKS for a payment with a missing account (FKs off)", async () => {
    const payableId = await seedPayable({ billerId: await seedBiller("Acct Link Biller") });
    await withForeignKeysOff(async () => {
      await db.runAsync(
        `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
         VALUES (?, 999999, NULL, 1000, '2026-05-10', NULL, ?)`,
        payableId,
        nowIso()
      );
    });
    expect(await issueCount(db, "ORPHAN_PAYABLE_ACCOUNT_LINKS")).toBe(1);
  });

  it("flags ORPHAN_PAYABLE_EXPENSE_LINKS for a payment with a missing expense (FKs off)", async () => {
    const payableId = await seedPayable({ billerId: await seedBiller("Exp Link Biller") });
    await withForeignKeysOff(async () => {
      await db.runAsync(
        `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
         VALUES (?, NULL, 999999, 1000, '2026-05-10', NULL, ?)`,
        payableId,
        nowIso()
      );
    });
    expect(await issueCount(db, "ORPHAN_PAYABLE_EXPENSE_LINKS")).toBe(1);
  });

  it("flags ORPHAN_EXPENSE_CATEGORIES for an expense with a missing category (FKs off)", async () => {
    await withForeignKeysOff(async () => {
      await seedExpense({ categoryId: 999999 });
    });
    expect(await issueCount(db, "ORPHAN_EXPENSE_CATEGORIES")).toBe(1);
  });

  it("flags ORPHAN_PAYABLE_BILLERS for a payable with a missing biller (FKs off)", async () => {
    await withForeignKeysOff(async () => {
      await seedPayable({ billerId: 999999 });
    });
    expect(await issueCount(db, "ORPHAN_PAYABLE_BILLERS")).toBe(1);
  });
});

describe("PAID_PAYABLES_MISSING_EXPENSE", () => {
  it("flags a PAID payable with zero payments", async () => {
    await seedPayable({ billerId: await seedBiller("No Payment Biller"), status: "PAID" });
    expect(await issueCount(db, "PAID_PAYABLES_MISSING_EXPENSE")).toBe(1);
  });

  it("flags a PAID payable whose payment has no expense", async () => {
    const payableId = await seedPayable({
      billerId: await seedBiller("No Expense Biller"),
      status: "PAID",
    });
    await seedPayablePayment({ payableId });
    expect(await issueCount(db, "PAID_PAYABLES_MISSING_EXPENSE")).toBe(1);
  });

  it("stays clean when a PAID payable has a payment with an expense", async () => {
    const payableId = await seedPayable({
      billerId: await seedBiller("Healthy Biller"),
      status: "PAID",
    });
    const expenseId = await seedExpense();
    await seedPayablePayment({ payableId, expenseId });
    expect(await issueCount(db, "PAID_PAYABLES_MISSING_EXPENSE")).toBe(0);
  });
});

describe("INVALID_PAYABLE_DUE_DATES", () => {
  it("flags a payable with a non-ISO due date", async () => {
    await seedPayable({ billerId: await seedBiller("Bad Due Biller"), dueDate: "not-a-date" });
    expect(await issueCount(db, "INVALID_PAYABLE_DUE_DATES")).toBe(1);
  });

  it("stays clean for NULL, empty, and valid ISO due dates", async () => {
    await seedPayable({ billerId: await seedBiller("Null Due Biller"), dueDate: null });
    await seedPayable({ billerId: await seedBiller("Empty Due Biller"), dueDate: "" });
    await seedPayable({ billerId: await seedBiller("Good Due Biller"), dueDate: "2026-05-15" });
    expect(await issueCount(db, "INVALID_PAYABLE_DUE_DATES")).toBe(0);
  });
});

describe("DUPLICATE_*_LINK (unique index blocks the second insert; verify stays clean)", () => {
  it("blocks a second transaction with the same linkedExpenseId", async () => {
    const accountId = await insertTestAccount(db);
    const expenseId = await seedExpense();
    await seedTransaction({ accountId, linkedExpenseId: expenseId, entryKind: "EXPENSE_LINK" });

    await expect(
      seedTransaction({ accountId, linkedExpenseId: expenseId, entryKind: "EXPENSE_LINK" })
    ).rejects.toThrow(/UNIQUE constraint failed/i);

    const report = await verify(asDb(db));
    expect(report.issues.find((i) => i.code === "DUPLICATE_EXPENSE_LINK")).toBeUndefined();
    expect(report.ok).toBe(true);
  });

  it("blocks a second transaction with the same linkedReceivablePaymentId", async () => {
    const accountId = await insertTestAccount(db);
    const paymentId = await seedReceivablePayment();
    await seedTransaction({
      accountId,
      linkedReceivablePaymentId: paymentId,
      entryKind: "RECEIVABLE_PAYMENT_LINK",
    });

    await expect(
      seedTransaction({
        accountId,
        linkedReceivablePaymentId: paymentId,
        entryKind: "RECEIVABLE_PAYMENT_LINK",
      })
    ).rejects.toThrow(/UNIQUE constraint failed/i);

    const report = await verify(asDb(db));
    expect(
      report.issues.find((i) => i.code === "DUPLICATE_RECEIVABLEPAYMENT_LINK")
    ).toBeUndefined();
    expect(report.ok).toBe(true);
  });

  it("blocks a second transaction with the same linkedPayablePaymentId", async () => {
    const accountId = await insertTestAccount(db);
    const paymentId = await seedPayablePayment();
    await seedTransaction({
      accountId,
      linkedPayablePaymentId: paymentId,
      entryKind: "PAYABLE_PAYMENT_LINK",
    });

    await expect(
      seedTransaction({
        accountId,
        linkedPayablePaymentId: paymentId,
        entryKind: "PAYABLE_PAYMENT_LINK",
      })
    ).rejects.toThrow(/UNIQUE constraint failed/i);

    const report = await verify(asDb(db));
    expect(report.issues.find((i) => i.code === "DUPLICATE_PAYABLEPAYMENT_LINK")).toBeUndefined();
    expect(report.ok).toBe(true);
  });
});
