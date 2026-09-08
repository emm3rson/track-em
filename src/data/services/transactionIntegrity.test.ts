/**
 * End-to-end integration regression tests over REAL services against TestDb.
 *
 * NOTE on scope: transaction CRUD guards are exercised at the
 * `accountService` level only. `src/features/cashflow/service.ts` is
 * deliberately NOT imported here: it pulls `../../data` (which
 * value-imports `./db` -> the expo-sqlite native module, unavailable in
 * Jest) and the `../accounts/service` feature chain. The guard logic in
 * cashflow `editTransaction`/`removeTransaction` duplicates the
 * `accountService.assertDirectlyMutable` checks, so covering accountService
 * covers the highest-risk behavior without the RN import chain.
 */
jest.mock("../getDb", () => ({
  getDb: jest.fn(),
}));

import { getDb } from "../getDb";
import type { Db } from "../db";
import { createTestDb, getFallbackCategoryId, type TestDb } from "../__tests__/sqliteTestDb";
import * as accountService from "./accountService";
import * as expenseService from "./expenseService";
import * as payableService from "./payableService";
import * as receivableService from "./receivableService";
import * as transferService from "./transferService";
import { verify } from "./integrityService";

let db: TestDb;
let categoryId: number;

beforeEach(async () => {
  db = await createTestDb();
  (getDb as jest.Mock).mockResolvedValue(db);
  categoryId = await getFallbackCategoryId(db);
});

afterEach(() => {
  db.close();
});

// ─── Helpers ───────────────────────────────────────────

async function makeAccount(name: string, initialBalance = 0): Promise<number> {
  return accountService.createAccount({ name, type: "SOURCE", initialBalance });
}

async function tableCount(table: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`);
  return row?.total ?? 0;
}

async function makePayable(params?: {
  biller?: string;
  month?: string;
  amount?: number;
}): Promise<number> {
  const { payableId } = await payableService.upsertPayable({
    billerName: params?.biller ?? `Biller ${Math.random().toString(36).slice(2, 8)}`,
    monthIsoAnchor: params?.month ?? "2026-01-01",
    amount: params?.amount ?? 10000,
    status: "UNPAID",
    categoryId,
  });
  return payableId;
}

async function rawPayableStatus(payableId: number): Promise<string> {
  const row = await db.getFirstAsync<{ status: string }>(
    `SELECT status FROM payables WHERE id = ?`,
    payableId
  );
  if (!row) throw new Error(`Payable ${payableId} missing`);
  return row.status;
}

// ─── 1. Atomicity: failed multi-entity writes roll back ─

describe("atomicity — failed multi-entity writes leave no partial rows", () => {
  it("failed payable payment (exceeds remaining) leaves expense/payment/transaction counts unchanged", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Electric Co" });
    await payableService.recordPayablePayment({
      payableId,
      amount: 3000,
      accountId,
      paymentDateIso: "2026-01-10",
    });

    const before = {
      expenses: await tableCount("expenses"),
      payments: await tableCount("payable_payments"),
      transactions: await tableCount("transactions"),
    };

    await expect(
      payableService.recordPayablePayment({
        payableId,
        amount: 8000,
        accountId,
        paymentDateIso: "2026-01-11",
      })
    ).rejects.toThrow("Payment exceeds remaining balance.");

    expect(await tableCount("expenses")).toBe(before.expenses);
    expect(await tableCount("payable_payments")).toBe(before.payments);
    expect(await tableCount("transactions")).toBe(before.transactions);
    const view = await payableService.getPayableById(payableId);
    expect(view?.paidAmount).toBe(3000);
  });

  it("failed transfer (same account) leaves zero new rows", async () => {
    const accountId = await makeAccount("Solo");
    const txBefore = await tableCount("transactions");
    const expBefore = await tableCount("expenses");

    await expect(
      transferService.createTransfer({
        fromAccountId: accountId,
        toAccountId: accountId,
        amount: 1000,
        dateIso: "2026-05-01",
      })
    ).rejects.toThrow("Cannot transfer to the same account.");

    expect(await tableCount("transactions")).toBe(txBefore);
    expect(await tableCount("expenses")).toBe(expBefore);
  });

  it("failed receivable overpayment leaves counts unchanged", async () => {
    const accountId = await makeAccount("Checking");
    const receivableId = await receivableService.createReceivable({
      person: "Ana",
      amount: 10000,
      dateIso: "2026-05-01",
    });
    await receivableService.recordPayment({
      receivableId,
      amount: 9000,
      person: "Ana",
      accountId,
    });

    const paymentsBefore = await tableCount("receivable_payments");
    const txBefore = await tableCount("transactions");

    await expect(
      receivableService.recordPayment({
        receivableId,
        amount: 2000,
        person: "Ana",
        accountId,
      })
    ).rejects.toThrow("Payment exceeds remaining balance.");

    expect(await tableCount("receivable_payments")).toBe(paymentsBefore);
    expect(await tableCount("transactions")).toBe(txBefore);
  });

  it("failed expense update on a bill-payment-linked expense throws and leaves the original intact", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Water Co", amount: 5000 });
    await payableService.recordPayablePayment({
      payableId,
      amount: 5000,
      accountId,
      paymentDateIso: "2026-02-10",
    });
    const payments = await payableService.listPayments(payableId);
    const expenseId = payments[0]?.expenseId;
    if (expenseId == null) throw new Error("Expected bill payment to create an expense");

    const before = await expenseService.getById(expenseId);
    const txBefore = await tableCount("transactions");

    await expect(
      expenseService.updateExpense({
        id: expenseId,
        dateIso: "2026-03-01",
        amount: 999,
        categoryId,
      })
    ).rejects.toThrow("can only be edited from Obligations");

    expect(await expenseService.getById(expenseId)).toEqual(before);
    expect(await tableCount("transactions")).toBe(txBefore);
  });
});

// ─── 2. Transaction CRUD guards (accountService level) ──

describe("transaction CRUD guards", () => {
  async function seedTransferLeg(): Promise<number> {
    const from = await makeAccount("T-From");
    const to = await makeAccount("T-To");
    const groupId = await transferService.createTransfer({
      fromAccountId: from,
      toAccountId: to,
      amount: 1000,
      dateIso: "2026-05-01",
    });
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE transferGroupId = ? ORDER BY id ASC LIMIT 1`,
      groupId
    );
    if (!row) throw new Error("Transfer leg missing");
    return row.id;
  }

  async function seedExpenseLinkedTx(): Promise<number> {
    const accountId = await makeAccount("Expense Acct");
    const expenseId = await expenseService.addExpense({
      dateIso: "2026-05-01",
      amount: 1500,
      categoryId,
      accountId,
    });
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE linkedExpenseId = ? LIMIT 1`,
      expenseId
    );
    if (!row) throw new Error("Expense-linked tx missing");
    return row.id;
  }

  async function seedPayableLinkedTx(): Promise<number> {
    const accountId = await makeAccount("Payable Acct");
    const payableId = await makePayable({ biller: "Guard Power" });
    await payableService.recordPayablePayment({
      payableId,
      amount: 2000,
      accountId,
      paymentDateIso: "2026-02-10",
    });
    const payments = await payableService.listPayments(payableId);
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE linkedPayablePaymentId = ? LIMIT 1`,
      payments[0]?.id
    );
    if (!row) throw new Error("Payable-linked tx missing");
    return row.id;
  }

  async function seedReceivableLinkedTx(): Promise<number> {
    const accountId = await makeAccount("Receivable Acct");
    const receivableId = await receivableService.createReceivable({
      person: "Guard Ana",
      amount: 5000,
      dateIso: "2026-05-01",
    });
    const paymentId = await receivableService.recordPayment({
      receivableId,
      amount: 2000,
      person: "Guard Ana",
      accountId,
    });
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE linkedReceivablePaymentId = ? LIMIT 1`,
      paymentId
    );
    if (!row) throw new Error("Receivable-linked tx missing");
    return row.id;
  }

  async function seedLentMoneyTx(): Promise<number> {
    const accountId = await makeAccount("Lent Acct");
    const { ledgerEntryId } = await receivableService.logLentMoney({
      person: "Guard Bob",
      amount: 7000,
      dateIso: "2026-05-01",
      accountId,
    });
    return ledgerEntryId;
  }

  async function seedReconciliationTx(): Promise<number> {
    const accountId = await makeAccount("Recon Acct", 5000);
    await accountService.reconcileBalance({
      accountId,
      desiredBalance: 6000,
      dateIso: "2026-05-02",
    });
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE accountId = ? AND entryKind = 'RECONCILIATION' LIMIT 1`,
      accountId
    );
    if (!row) throw new Error("Reconciliation tx missing");
    return row.id;
  }

  const guardCases: { name: string; seed: () => Promise<number>; message: string }[] = [
    {
      name: "transfer leg",
      seed: seedTransferLeg,
      message: "Transfer transactions cannot be changed individually.",
    },
    {
      name: "EXPENSE_LINK",
      seed: seedExpenseLinkedTx,
      message: "Expense-linked transactions can only be changed from Monthly Expenses.",
    },
    {
      name: "PAYABLE_LINK",
      seed: seedPayableLinkedTx,
      message: "Payable-linked transactions can only be changed from Payables.",
    },
    {
      name: "RECEIVABLE_LINK",
      seed: seedReceivableLinkedTx,
      message: "Receivable-linked transactions can only be changed from Receivables.",
    },
    {
      name: "LENT_MONEY_LINK",
      seed: seedLentMoneyTx,
      message: "Lent money transactions can only be changed from Receivables.",
    },
    {
      name: "RECONCILIATION",
      seed: seedReconciliationTx,
      message:
        "Reconciliation entries cannot be changed directly. Reconcile the account again to adjust.",
    },
  ];

  for (const guardCase of guardCases) {
    it(`rejects update+delete for ${guardCase.name} with the expected message`, async () => {
      const id = await guardCase.seed();

      await expect(
        accountService.updateTransaction({ id, dateIso: "2026-05-02", amount: 123 })
      ).rejects.toThrow(guardCase.message);
      await expect(accountService.deleteTransaction(id)).rejects.toThrow(guardCase.message);

      // Guarded rows survive the rejected attempts.
      expect(await accountService.getTransaction(id)).not.toBeNull();
    });
  }

  it("rejects update+delete for a transaction in an archived account", async () => {
    const accountId = await makeAccount("Archive Me");
    await accountService.addManualEntry({
      accountId,
      dateIso: "2026-05-01",
      amount: 500,
      note: "manual",
    });
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions WHERE accountId = ? LIMIT 1`,
      accountId
    );
    if (!row) throw new Error("Manual tx missing");
    await accountService.archiveAccount(accountId);

    await expect(
      accountService.updateTransaction({ id: row.id, dateIso: "2026-05-02", amount: 600 })
    ).rejects.toThrow("Cannot edit a transaction in an archived account.");
    await expect(accountService.deleteTransaction(row.id)).rejects.toThrow(
      "Cannot delete a transaction in an archived account."
    );
  });
});

// ─── 3. Stale-state-after-write ─────────────────────────

describe("stale-state-after-write", () => {
  it("payable status flips UNPAID→PAID at exactly full amount; partial keeps UNPAID while displayStatus derives PARTIALLY_PAID", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Power Co", amount: 10000 });

    await payableService.recordPayablePayment({
      payableId,
      amount: 4000,
      accountId,
      paymentDateIso: "2026-01-10",
    });
    // Denormalized status stays UNPAID on partial…
    expect(await rawPayableStatus(payableId)).toBe("UNPAID");
    // …while the joined view derives PARTIALLY_PAID.
    const partial = await payableService.getPayableById(payableId);
    expect(partial?.displayStatus).toBe("PARTIALLY_PAID");
    expect(partial?.paidAmount).toBe(4000);
    expect(partial?.remainingAmount).toBe(6000);

    await payableService.recordPayablePayment({
      payableId,
      amount: 6000,
      accountId,
      paymentDateIso: "2026-01-20",
    });
    expect(await rawPayableStatus(payableId)).toBe("PAID");
    const full = await payableService.getPayableById(payableId);
    expect(full?.displayStatus).toBe("PAID");
    expect(full?.remainingAmount).toBe(0);
  });

  it("updatePayablePayment amount change resyncs payable status", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Resync Power", amount: 10000 });
    await payableService.recordPayablePayment({
      payableId,
      amount: 10000,
      accountId,
      paymentDateIso: "2026-01-10",
    });
    expect(await rawPayableStatus(payableId)).toBe("PAID");

    const payments = await payableService.listPayments(payableId);
    const paymentId = payments[0]?.id;
    if (paymentId == null) throw new Error("Payment missing");
    await payableService.updatePayablePayment({
      paymentId,
      payableId,
      amount: 6000,
      accountId,
      paymentDateIso: "2026-01-12",
    });

    expect(await rawPayableStatus(payableId)).toBe("UNPAID");
    const view = await payableService.getPayableById(payableId);
    expect(view?.displayStatus).toBe("PARTIALLY_PAID");
    expect(view?.paidAmount).toBe(6000);
  });

  it("deletePayablePayment un-sets PAID", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Unset Power", amount: 10000 });
    await payableService.recordPayablePayment({
      payableId,
      amount: 10000,
      accountId,
      paymentDateIso: "2026-01-10",
    });
    expect(await rawPayableStatus(payableId)).toBe("PAID");

    const payments = await payableService.listPayments(payableId);
    const paymentId = payments[0]?.id;
    if (paymentId == null) throw new Error("Payment missing");
    await payableService.deletePayablePayment({ paymentId, payableId });

    expect(await rawPayableStatus(payableId)).toBe("UNPAID");
    const view = await payableService.getPayableById(payableId);
    expect(view?.displayStatus).toBe("UNPAID");
    expect(view?.paidAmount).toBe(0);
  });

  it("deletePayable removes payments+expenses+transactions leaving zero orphans (verify ok)", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Doomed Power", amount: 10000 });
    await payableService.recordPayablePayment({
      payableId,
      amount: 10000,
      accountId,
      paymentDateIso: "2026-01-10",
    });

    await payableService.deletePayable(payableId);

    expect(await payableService.getPayableById(payableId)).toBeNull();
    expect(await tableCount("payable_payments")).toBe(0);
    expect(await tableCount("expenses")).toBe(0);
    expect(await tableCount("transactions")).toBe(0);
    const report = await verify(db as unknown as Db);
    expect(report.ok).toBe(true);
  });

  it("receivable recordPayment settles and auto-archives at full amount", async () => {
    const accountId = await makeAccount("Checking");
    const receivableId = await receivableService.createReceivable({
      person: "Ana",
      amount: 5000,
      dateIso: "2026-05-01",
    });
    await receivableService.recordPayment({
      receivableId,
      amount: 5000,
      person: "Ana",
      accountId,
    });

    const row = await receivableService.getById(receivableId);
    expect(row?.settled).toBe(1);
    expect(row?.archived).toBe(1);
    const active = await receivableService.listActive();
    expect(active.map((r) => r.id)).not.toContain(receivableId);
  });

  it("receivable deletePayment un-settles and un-archives so the row resurfaces", async () => {
    const accountId = await makeAccount("Checking");
    const receivableId = await receivableService.createReceivable({
      person: "Beto",
      amount: 5000,
      dateIso: "2026-05-01",
    });
    const paymentId = await receivableService.recordPayment({
      receivableId,
      amount: 5000,
      person: "Beto",
      accountId,
    });
    expect((await receivableService.getById(receivableId))?.archived).toBe(1);

    await receivableService.deletePayment({ paymentId, receivableId });

    const row = await receivableService.getById(receivableId);
    expect(row?.settled).toBe(0);
    expect(row?.archived).toBe(0);
    const active = await receivableService.listActive();
    expect(active.map((r) => r.id)).toContain(receivableId);
  });

  it("updateReceivable amount below paidTotal throws and keeps the principal", async () => {
    const accountId = await makeAccount("Checking");
    const receivableId = await receivableService.createReceivable({
      person: "Caps",
      amount: 10000,
      dateIso: "2026-05-01",
    });
    await receivableService.recordPayment({
      receivableId,
      amount: 9000,
      person: "Caps",
      accountId,
    });

    await expect(
      receivableService.updateReceivable(receivableId, { amount: 8000 })
    ).rejects.toThrow("lower than the total already paid");
    expect((await receivableService.getById(receivableId))?.amount).toBe(10000);
  });

  it("logLentMoney creates an outflow + back-pointer; updateReceivable amount syncs the linked tx", async () => {
    const accountId = await makeAccount("Checking");
    const { receivableId, ledgerEntryId } = await receivableService.logLentMoney({
      person: "Bob",
      amount: 7000,
      dateIso: "2026-05-01",
      accountId,
    });

    const tx = await accountService.getTransaction(ledgerEntryId);
    expect(tx?.amount).toBe(-7000);
    expect(tx?.entryKind).toBe("LENT_MONEY_LINK");
    const created = await receivableService.getById(receivableId);
    expect(created?.linkedTransactionId).toBe(ledgerEntryId);
    expect(created?.amount).toBe(7000);

    await receivableService.updateReceivable(receivableId, { amount: 6500 });

    const syncedTx = await accountService.getTransaction(ledgerEntryId);
    expect(syncedTx?.amount).toBe(-6500);
    expect((await receivableService.getById(receivableId))?.amount).toBe(6500);
  });
});

// ─── 4. Money/cents exactness ───────────────────────────

describe("money/cents exactness", () => {
  it("expense 1999 cents stays 1999 through the expense→transaction linkage", async () => {
    const accountId = await makeAccount("Checking");
    const expenseId = await expenseService.addExpense({
      dateIso: "2026-05-01",
      amount: 1999,
      categoryId,
      accountId,
    });

    const expense = await db.getFirstAsync<{ amount: number }>(
      `SELECT amount FROM expenses WHERE id = ?`,
      expenseId
    );
    const tx = await db.getFirstAsync<{ amount: number }>(
      `SELECT amount FROM transactions WHERE linkedExpenseId = ? LIMIT 1`,
      expenseId
    );
    expect(expense?.amount).toBe(1999);
    expect(tx?.amount).toBe(-1999);
  });

  it("transfer of 100.50-equivalent cents is exact on both legs", async () => {
    const from = await makeAccount("T-From");
    const to = await makeAccount("T-To");
    const groupId = await transferService.createTransfer({
      fromAccountId: from,
      toAccountId: to,
      amount: 10050,
      dateIso: "2026-05-01",
    });

    const legs = await db.getAllAsync<{ amount: number }>(
      `SELECT amount FROM transactions WHERE transferGroupId = ? ORDER BY amount ASC`,
      groupId
    );
    expect(legs.map((l) => l.amount)).toEqual([-10050, 10050]);
    expect(legs[0]!.amount + legs[1]!.amount).toBe(0);
  });
});

// ─── 5. Dates use paymentDateIso ────────────────────────

describe("payable payment dates", () => {
  it("expense.date + transaction.date + paidAt use paymentDateIso, not the payable month", async () => {
    const accountId = await makeAccount("Checking");
    const payableId = await makePayable({ biller: "Dated Power", month: "2026-01-01" });
    await payableService.recordPayablePayment({
      payableId,
      amount: 2500,
      accountId,
      paymentDateIso: "2026-03-15",
    });

    const payments = await payableService.listPayments(payableId);
    const payment = payments[0];
    if (!payment?.expenseId) throw new Error("Payment/expense missing");
    const expense = await db.getFirstAsync<{ date: string }>(
      `SELECT date FROM expenses WHERE id = ?`,
      payment.expenseId
    );
    const tx = await db.getFirstAsync<{ date: string }>(
      `SELECT date FROM transactions WHERE linkedPayablePaymentId = ? LIMIT 1`,
      payment.id
    );

    expect(payment.paidAt).toBe("2026-03-15");
    expect(expense?.date).toBe("2026-03-15");
    expect(tx?.date).toBe("2026-03-15");
    expect(payment.paidAt).not.toBe("2026-01-01");
    expect(expense?.date).not.toBe("2026-01-01");
    expect(tx?.date).not.toBe("2026-01-01");
  });
});
