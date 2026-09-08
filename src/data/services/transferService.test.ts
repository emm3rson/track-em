jest.mock("../getDb", () => ({ getDb: jest.fn() }));

import { getDb } from "../getDb";
import { createTestDb, insertTestAccount, type TestDb } from "../__tests__/sqliteTestDb";
import type { Db } from "../db";
import * as accountRepo from "../repositories/accountRepo";
import * as expenseCategoryRepo from "../repositories/expenseCategoryRepo";
import * as expenseRepo from "../repositories/expenseRepo";
import * as transactionRepo from "../repositories/transactionRepo";
import { EntryKind } from "../types";
import { createTransfer, deleteTransfer } from "./transferService";

let db: TestDb;
/** Repos are typed against expo-sqlite's Db; the harness adapter is
 *  structurally compatible at runtime, so cast at the boundary. */
const asDb = () => db as unknown as Db;

beforeEach(async () => {
  db = await createTestDb();
  (getDb as jest.Mock).mockResolvedValue(db);
});
afterEach(() => db.close());

const DATE = "2026-05-01";

async function countTransactions(): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM transactions`);
  return row?.n ?? 0;
}

async function countExpenses(): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM expenses`);
  return row?.n ?? 0;
}

async function countCategories(): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM expense_categories`);
  return row?.n ?? 0;
}

describe("transferService integration (real SQLite, no repo mocks)", () => {
  it("creates mirrored legs with a shared groupId and moves balances (no fee)", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Checking A",
      initialBalance: 10000,
    });
    const toId = await insertTestAccount(db, {
      name: "Savings B",
      initialBalance: 2000,
    });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 2500,
      dateIso: DATE,
      note: "Rent move",
    });

    expect(typeof groupId).toBe("string");
    const legs = await transactionRepo.findByTransferGroupId(asDb(), groupId);
    expect(legs).toHaveLength(2);
    expect(legs[0].transferGroupId).toBe(groupId);
    expect(legs[1].transferGroupId).toBe(groupId);
    const byAccount = new Map(legs.map((leg) => [leg.accountId, leg.amount]));
    expect(byAccount.get(fromId)).toBe(-2500);
    expect(byAccount.get(toId)).toBe(2500);
    expect(legs.every((leg) => leg.entryKind === EntryKind.MANUAL)).toBe(true);
    expect(legs.every((leg) => leg.linkedExpenseId === null)).toBe(true);

    expect(await accountRepo.computeBalance(asDb(), fromId)).toBe(7500);
    expect(await accountRepo.computeBalance(asDb(), toId)).toBe(4500);

    // A second transfer gets a distinct group id.
    const groupId2 = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 500,
      dateIso: DATE,
    });
    expect(groupId2).not.toBe(groupId);
    expect(await countTransactions()).toBe(4);
  });

  it("records a fee as a Transfer Fees expense + EXPENSE_LINK leg debited from source only", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Checking Alpha",
      initialBalance: 10000,
    });
    const toId = await insertTestAccount(db, {
      name: "Savings Beta",
      initialBalance: 0,
    });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 4000,
      fee: 150,
      dateIso: DATE,
      note: "House move",
    });

    const legs = await transactionRepo.findByTransferGroupId(asDb(), groupId);
    expect(legs).toHaveLength(3);
    const debit = legs.find(
      (leg) => leg.accountId === fromId && leg.entryKind === EntryKind.MANUAL
    );
    const credit = legs.find((leg) => leg.accountId === toId);
    const feeLeg = legs.find((leg) => leg.entryKind === EntryKind.EXPENSE_LINK);
    expect(debit?.amount).toBe(-4000);
    expect(credit?.amount).toBe(4000);
    expect(credit?.entryKind).toBe(EntryKind.MANUAL);
    expect(feeLeg?.accountId).toBe(fromId);
    expect(feeLeg?.amount).toBe(-150);
    expect(feeLeg?.linkedExpenseId).not.toBeNull();

    const feeExpense =
      feeLeg?.linkedExpenseId != null
        ? await expenseRepo.findById(asDb(), feeLeg.linkedExpenseId)
        : null;
    expect(feeExpense).not.toBeNull();
    expect(feeExpense?.amount).toBe(150);
    expect(feeExpense?.accountId).toBe(fromId);
    const feeCategory = await expenseCategoryRepo.findById(asDb(), feeExpense?.categoryId ?? -1);
    expect(feeCategory?.name).toBe("Transfer Fees");
    expect(feeExpense?.note).toContain("Checking Alpha");
    expect(feeExpense?.note).toContain("Savings Beta");
    expect(feeLeg?.note).toBe(feeExpense?.note);

    // Fee is taken from the source only; destination gets the full amount.
    expect(await accountRepo.computeBalance(asDb(), fromId)).toBe(10000 - 4000 - 150);
    expect(await accountRepo.computeBalance(asDb(), toId)).toBe(4000);
  });

  it.each([0, -1, -500])("rejects non-positive amount (%i) and writes nothing", async (amount) => {
    const fromId = await insertTestAccount(db, { name: "V From" });
    const toId = await insertTestAccount(db, { name: "V To" });

    await expect(
      createTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
        dateIso: DATE,
      })
    ).rejects.toThrow("positive");
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
  });

  it("rejects transfers to the same account and writes nothing", async () => {
    const accountId = await insertTestAccount(db, { name: "Same Acct" });

    await expect(
      createTransfer({
        fromAccountId: accountId,
        toAccountId: accountId,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("same account");
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
  });

  it("rejects a missing source or destination and writes nothing", async () => {
    const realId = await insertTestAccount(db, { name: "Real Acct" });

    await expect(
      createTransfer({
        fromAccountId: 999001,
        toAccountId: realId,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");
    await expect(
      createTransfer({
        fromAccountId: realId,
        toAccountId: 999002,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
  });

  it("rejects an archived source or destination and writes nothing", async () => {
    const activeId = await insertTestAccount(db, { name: "Active Acct" });
    const archivedSourceId = await insertTestAccount(db, {
      name: "Archived Source",
      archived: 1,
    });
    const archivedDestId = await insertTestAccount(db, {
      name: "Archived Dest",
      archived: 1,
    });

    await expect(
      createTransfer({
        fromAccountId: archivedSourceId,
        toAccountId: activeId,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");
    await expect(
      createTransfer({
        fromAccountId: activeId,
        toAccountId: archivedDestId,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
  });

  it("rejects a source or destination excluded from totals and writes nothing", async () => {
    const activeId = await insertTestAccount(db, { name: "Active Acct" });
    const excludedSourceId = await insertTestAccount(db, {
      name: "Excluded Source",
      includeInTotals: 0,
    });
    const excludedDestId = await insertTestAccount(db, {
      name: "Excluded Dest",
      includeInTotals: 0,
    });

    await expect(
      createTransfer({
        fromAccountId: excludedSourceId,
        toAccountId: activeId,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");
    await expect(
      createTransfer({
        fromAccountId: activeId,
        toAccountId: excludedDestId,
        amount: 100,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
  });

  it("rejects a negative fee instead of silently dropping it", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Neg Fee From",
      initialBalance: 10000,
    });
    const toId = await insertTestAccount(db, {
      name: "Neg Fee To",
      initialBalance: 0,
    });

    await expect(
      createTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: 1000,
        fee: -500,
        dateIso: DATE,
      })
    ).rejects.toThrow("Transfer fee must be zero or greater.");
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
    expect(await accountRepo.computeBalance(asDb(), fromId)).toBe(10000);
    expect(await accountRepo.computeBalance(asDb(), toId)).toBe(0);
  });

  it("treats an explicit zero fee as a no-fee transfer", async () => {
    const fromId = await insertTestAccount(db, { name: "Zero Fee From" });
    const toId = await insertTestAccount(db, { name: "Zero Fee To" });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 1000,
      fee: 0,
      dateIso: DATE,
    });

    const legs = await transactionRepo.findByTransferGroupId(asDb(), groupId);
    expect(legs).toHaveLength(2);
    expect(await countExpenses()).toBe(0);
  });

  it("a failed transfer with a fee leaves no transactions, expenses, or fee category", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Atomic From",
      initialBalance: 5000,
    });
    const categoriesBefore = await countCategories();

    await expect(
      createTransfer({
        fromAccountId: fromId,
        toAccountId: 999777,
        amount: 1000,
        fee: 50,
        dateIso: DATE,
      })
    ).rejects.toThrow("not available");

    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
    expect(await expenseCategoryRepo.findByName(asDb(), "Transfer Fees")).toBeNull();
    expect(await countCategories()).toBe(categoriesBefore);
  });

  it("rolls back transfer legs when the fee expense insert fails", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Rollback From",
      initialBalance: 5000,
    });
    const toId = await insertTestAccount(db, {
      name: "Rollback To",
      initialBalance: 0,
    });

    // Force the expense insert inside createTransfer to fail so the
    // already-inserted legs must be rolled back atomically.
    await db.execAsync(
      `CREATE TRIGGER trg_test_abort_expense_insert BEFORE INSERT ON expenses FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'test abort expense insert'); END;`
    );
    try {
      await expect(
        createTransfer({
          fromAccountId: fromId,
          toAccountId: toId,
          amount: 1000,
          fee: 100,
          dateIso: DATE,
        })
      ).rejects.toThrow("test abort expense insert");
      expect(await countTransactions()).toBe(0);
      expect(await countExpenses()).toBe(0);
    } finally {
      await db.execAsync(`DROP TRIGGER IF EXISTS trg_test_abort_expense_insert;`);
    }

    // Harness is usable again after the aborted transfer.
    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 1000,
      dateIso: DATE,
    });
    expect(await transactionRepo.findByTransferGroupId(asDb(), groupId)).toHaveLength(2);
  });

  it("deleteTransfer removes both legs of a no-fee transfer and restores balances", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Del From",
      initialBalance: 5000,
    });
    const toId = await insertTestAccount(db, {
      name: "Del To",
      initialBalance: 1000,
    });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 1200,
      dateIso: DATE,
    });
    expect(await countTransactions()).toBe(2);

    await deleteTransfer(groupId);

    expect(await transactionRepo.findByTransferGroupId(asDb(), groupId)).toHaveLength(0);
    expect(await countTransactions()).toBe(0);
    expect(await accountRepo.computeBalance(asDb(), fromId)).toBe(5000);
    expect(await accountRepo.computeBalance(asDb(), toId)).toBe(1000);
  });

  it("deleteTransfer removes legs + fee leg + fee expense and restores balances", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Del Fee From",
      initialBalance: 8000,
    });
    const toId = await insertTestAccount(db, {
      name: "Del Fee To",
      initialBalance: 500,
    });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 3000,
      fee: 200,
      dateIso: DATE,
    });
    const legsBefore = await transactionRepo.findByTransferGroupId(asDb(), groupId);
    expect(legsBefore).toHaveLength(3);
    const feeLegBefore = legsBefore.find((leg) => leg.entryKind === EntryKind.EXPENSE_LINK);
    const feeExpenseId = feeLegBefore?.linkedExpenseId;
    expect(feeExpenseId).not.toBeNull();
    expect(await countExpenses()).toBe(1);

    await deleteTransfer(groupId);

    expect(await transactionRepo.findByTransferGroupId(asDb(), groupId)).toHaveLength(0);
    expect(await countTransactions()).toBe(0);
    expect(await countExpenses()).toBe(0);
    if (feeExpenseId != null) {
      expect(await expenseRepo.findById(asDb(), feeExpenseId)).toBeNull();
    }
    expect(await accountRepo.computeBalance(asDb(), fromId)).toBe(8000);
    expect(await accountRepo.computeBalance(asDb(), toId)).toBe(500);
  });

  it("deleteTransfer is idempotent for unknown groupIds and leaves other data intact", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Idem From",
      initialBalance: 5000,
    });
    const toId = await insertTestAccount(db, {
      name: "Idem To",
      initialBalance: 1000,
    });
    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 700,
      dateIso: DATE,
    });

    await expect(deleteTransfer("transfer_does_not_exist_123")).resolves.toBeUndefined();

    expect(await transactionRepo.findByTransferGroupId(asDb(), groupId)).toHaveLength(2);
    expect(await accountRepo.computeBalance(asDb(), fromId)).toBe(4300);
    expect(await accountRepo.computeBalance(asDb(), toId)).toBe(1700);
  });

  it("reuses the same Transfer Fees category across fee transfers", async () => {
    const fromId = await insertTestAccount(db, { name: "Reuse From" });
    const toId = await insertTestAccount(db, { name: "Reuse To" });
    const categoriesBefore = await countCategories();

    const group1 = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 1000,
      fee: 50,
      dateIso: DATE,
    });
    const legs1 = await transactionRepo.findByTransferGroupId(asDb(), group1);
    const feeLeg1 = legs1.find((leg) => leg.entryKind === EntryKind.EXPENSE_LINK);
    const expense1 =
      feeLeg1?.linkedExpenseId != null
        ? await expenseRepo.findById(asDb(), feeLeg1.linkedExpenseId)
        : null;

    const group2 = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 2000,
      fee: 75,
      dateIso: DATE,
    });
    const legs2 = await transactionRepo.findByTransferGroupId(asDb(), group2);
    const feeLeg2 = legs2.find((leg) => leg.entryKind === EntryKind.EXPENSE_LINK);
    const expense2 =
      feeLeg2?.linkedExpenseId != null
        ? await expenseRepo.findById(asDb(), feeLeg2.linkedExpenseId)
        : null;

    expect(expense1?.categoryId).not.toBeNull();
    expect(expense2?.categoryId).toBe(expense1?.categoryId);
    // Exactly one new category ("Transfer Fees") for both fee transfers.
    expect(await countCategories()).toBe(categoriesBefore + 1);
  });

  it("stores exact integer cents with no float drift", async () => {
    const fromId = await insertTestAccount(db, {
      name: "Cents From",
      initialBalance: 100000,
    });
    const toId = await insertTestAccount(db, {
      name: "Cents To",
      initialBalance: 0,
    });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 1050,
      fee: 99,
      dateIso: DATE,
    });

    const legs = await transactionRepo.findByTransferGroupId(asDb(), groupId);
    const amounts = legs.map((leg) => leg.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([-1050, -99, 1050]);
    for (const leg of legs) {
      expect(Number.isInteger(leg.amount)).toBe(true);
    }
    const feeLeg = legs.find((leg) => leg.entryKind === EntryKind.EXPENSE_LINK);
    const feeExpense =
      feeLeg?.linkedExpenseId != null
        ? await expenseRepo.findById(asDb(), feeLeg.linkedExpenseId)
        : null;
    expect(feeExpense?.amount).toBe(99);
  });

  it("transfer legs reference valid accounts (foreign keys enforced)", async () => {
    const fromId = await insertTestAccount(db, { name: "FK From" });
    const toId = await insertTestAccount(db, { name: "FK To" });

    const groupId = await createTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: 500,
      dateIso: DATE,
    });

    const joined = await db.getAllAsync<{ id: number }>(
      `SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.accountId WHERE t.transferGroupId = ?`,
      groupId
    );
    expect(joined).toHaveLength(2);

    // The harness enforces FKs like production, so a leg pointing at a
    // nonexistent account cannot be written directly either.
    await expect(
      db.runAsync(
        `INSERT INTO transactions (accountId, date, amount, entryKind, linkedExpenseId, linkedReceivablePaymentId, linkedPayablePaymentId, transferGroupId, note, createdAt) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`,
        999888,
        DATE,
        100,
        EntryKind.MANUAL,
        "orphan",
        new Date().toISOString()
      )
    ).rejects.toThrow();
  });
});
