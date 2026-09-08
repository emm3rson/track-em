jest.mock("../getDb", () => ({ getDb: jest.fn() }));

import { getDb } from "../getDb";
import { createTestDb, insertTestAccount, type TestDb } from "../__tests__/sqliteTestDb";
import type { Db } from "../db";
import * as payableRepo from "./payableRepo";
import * as payableService from "../services/payableService";

let db: TestDb;
let adb: Db;

function asDb(): Db {
  return db as unknown as Db;
}

async function makePayable(billerName: string, month: string, amount: number): Promise<number> {
  const { payableId } = await payableService.upsertPayable({
    billerName,
    monthIsoAnchor: month,
    amount,
    status: "UNPAID",
  });
  return payableId;
}

async function pay(
  payableId: number,
  amount: number,
  accountId?: number | null,
  paymentDateIso = "2026-09-10"
): Promise<void> {
  await payableService.recordPayablePayment({
    payableId,
    amount,
    accountId: accountId ?? null,
    paymentDateIso,
  });
}

/** Bypass the service overpayment guard to simulate legacy/overpaid rows. */
async function insertRawPayment(payableId: number, amount: number, paidAt: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO payable_payments (payableId, accountId, expenseId, amount, paidAt, note, createdAt)
     VALUES (?, NULL, NULL, ?, ?, NULL, ?)`,
    payableId,
    amount,
    paidAt,
    now
  );
}

beforeEach(async () => {
  db = await createTestDb();
  adb = asDb();
  (getDb as jest.Mock).mockResolvedValue(db);
});

afterEach(() => {
  jest.clearAllMocks();
  db.close();
});

describe("payableRepo remaining-balance SQL (real SQLite)", () => {
  it("computes partial remaining math via findAllWithBiller", async () => {
    const payableId = await makePayable("Meralco", "2026-09-01", 10000);
    await pay(payableId, 3000, null, "2026-09-05");
    await pay(payableId, 2000, null, "2026-09-12");

    const rows = await payableRepo.findAllWithBiller(adb);
    expect(rows).toHaveLength(1);
    expect(rows[0].paidAmount).toBe(5000);
    expect(rows[0].remainingAmount).toBe(5000);
    expect(rows[0].displayStatus).toBe("PARTIALLY_PAID");
    expect(rows[0].paymentCount).toBe(2);
  });

  it("reports full payment as PAID with zero remaining", async () => {
    const payableId = await makePayable("Meralco", "2026-09-01", 10000);
    await pay(payableId, 10000, null, "2026-09-10");

    const rows = await payableRepo.findAllWithBiller(adb);
    expect(rows).toHaveLength(1);
    expect(rows[0].paidAmount).toBe(10000);
    expect(rows[0].remainingAmount).toBe(0);
    expect(rows[0].displayStatus).toBe("PAID");
    expect(rows[0].paymentCount).toBe(1);
  });

  it("reports a payable with no payments as UNPAID with full remaining", async () => {
    await makePayable("Meralco", "2026-09-01", 10000);

    const rows = await payableRepo.findAllWithBiller(adb);
    expect(rows).toHaveLength(1);
    expect(rows[0].paidAmount).toBe(0);
    expect(rows[0].remainingAmount).toBe(10000);
    expect(rows[0].displayStatus).toBe("UNPAID");
    expect(rows[0].paymentCount).toBe(0);
    expect(rows[0].latestPaidAt).toBeNull();
  });

  it("clamps overpayment to remaining 0 and displays PAID", async () => {
    const payableId = await makePayable("Meralco", "2026-09-01", 5000);
    await insertRawPayment(payableId, 7000, "2026-09-10");

    const rows = await payableRepo.findAllWithBiller(adb);
    expect(rows).toHaveLength(1);
    expect(rows[0].paidAmount).toBe(7000);
    expect(rows[0].remainingAmount).toBe(0);
    expect(rows[0].displayStatus).toBe("PAID");
  });

  it("excludes archived payables from unpaid sums but keeps them in unfiltered findAll", async () => {
    const activeId = await makePayable("Meralco", "2026-09-01", 10000);
    const archivedId = await makePayable("PLDT", "2026-09-01", 4000);
    await payableRepo.setArchived(adb, archivedId, 1);

    expect(await payableRepo.sumAllUnpaid(adb)).toBe(10000);
    expect(await payableRepo.sumUnpaidByMonthRange(adb, "2026-09-01", "2026-09-01")).toBe(10000);

    const grouped = await payableRepo.listUnpaidGroupedByMonth(adb, "2026-09-01");
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ month: "2026-09-01", unpaid: 10000 });

    const all = await payableRepo.findAllWithBiller(adb);
    expect(all.map((r) => r.id).sort()).toEqual([activeId, archivedId].sort());

    const unarchived = await payableRepo.findAllWithBiller(adb, { archived: 0 });
    expect(unarchived.map((r) => r.id)).toEqual([activeId]);
  });

  it("sums unpaid with inclusive month bounds and returns 0 on an empty DB", async () => {
    expect(await payableRepo.sumAllUnpaid(adb)).toBe(0);
    expect(await payableRepo.sumUnpaidByMonthRange(adb, "2026-01-01", "2026-12-01")).toBe(0);

    const julyId = await makePayable("Meralco", "2026-07-01", 5000);
    await makePayable("PLDT", "2026-08-01", 3000);
    await makePayable("Globe", "2026-09-01", 2000);
    await pay(julyId, 1000, null, "2026-07-10");

    // Inclusive on both ends: Jul(4000) + Aug(3000).
    expect(await payableRepo.sumUnpaidByMonthRange(adb, "2026-07-01", "2026-08-01")).toBe(7000);
    expect(await payableRepo.sumUnpaidByMonthRange(adb, "2026-08-01", "2026-08-01")).toBe(3000);
    // Empty range above all data.
    expect(await payableRepo.sumUnpaidByMonthRange(adb, "2026-10-01", "2026-12-01")).toBe(0);

    const total = await payableRepo.sumAllUnpaid(adb);
    expect(total).toBe(9000);

    // sumAllUnpaid equals the sum of per-payable remainings.
    const rows = await payableRepo.findAllWithBiller(adb);
    const remainingSum = rows.reduce((sum, r) => sum + r.remainingAmount, 0);
    expect(total).toBe(remainingSum);
  });

  it("groups unpaid by month across two months", async () => {
    const septId = await makePayable("Meralco", "2026-09-01", 10000);
    await pay(septId, 3000, null, "2026-09-10");
    await makePayable("PLDT", "2026-10-01", 6000);

    const grouped = await payableRepo.listUnpaidGroupedByMonth(adb, "2026-09-01");
    expect(grouped).toEqual([
      { month: "2026-09-01", unpaid: 7000 },
      { month: "2026-10-01", unpaid: 6000 },
    ]);
  });

  it("reports a fully-paid month in the grouped list with unpaid 0", async () => {
    const payableId = await makePayable("Meralco", "2026-09-01", 5000);
    await pay(payableId, 5000, null, "2026-09-10");

    const grouped = await payableRepo.listUnpaidGroupedByMonth(adb, "2026-09-01");
    expect(grouped).toEqual([{ month: "2026-09-01", unpaid: 0 }]);
  });

  it("lists paid vs remaining totals per month", async () => {
    const septId = await makePayable("Meralco", "2026-09-01", 10000);
    await pay(septId, 4000, null, "2026-09-10");
    await makePayable("PLDT", "2026-10-01", 6000);

    const totals = await payableRepo.listStatusTotalsByMonth(adb);
    expect(totals).toEqual([
      { month: "2026-09-01", paid: 4000, remaining: 6000 },
      { month: "2026-10-01", paid: 0, remaining: 6000 },
    ]);
  });

  it("lists only fully-paid months strictly before beforeMonth", async () => {
    const julyId = await makePayable("Meralco", "2026-07-01", 5000);
    await pay(julyId, 5000, null, "2026-07-10");

    const augId = await makePayable("PLDT", "2026-08-01", 4000);
    await pay(augId, 1000, null, "2026-08-10");

    const septId = await makePayable("Globe", "2026-09-01", 2000);
    await pay(septId, 2000, null, "2026-09-10");

    // September is fully paid but not < beforeMonth, so it is excluded.
    expect(await payableRepo.listFullyPaidMonths(adb, "2026-09-01")).toEqual(["2026-07-01"]);

    // With a later bound both fully-paid months qualify; the partial month never does,
    // and months with no payables (e.g. 2026-06-01) are never returned.
    const later = await payableRepo.listFullyPaidMonths(adb, "2026-10-01");
    expect(later.sort()).toEqual(["2026-07-01", "2026-09-01"]);
    expect(later).not.toContain("2026-08-01");
    expect(later).not.toContain("2026-06-01");
  });

  it("matches biller case-insensitively with trimming", async () => {
    await makePayable("meralco", "2026-09-01", 8000);

    const hit = await payableRepo.findByMonthAndBiller(adb, "2026-09-01", "  MERALCO ");
    expect(hit).not.toBeNull();
    expect(hit?.billerName).toBe("meralco");
    expect(hit?.remainingAmount).toBe(8000);

    expect(await payableRepo.findByMonthAndBiller(adb, "2026-09-01", "PLDT")).toBeNull();
    expect(await payableRepo.findByMonthAndBiller(adb, "2026-10-01", "meralco")).toBeNull();
  });

  it("findByIdWithBiller agrees with findAllWithBiller and reports MAX(paidAt)", async () => {
    const payableId = await makePayable("Meralco", "2026-09-01", 10000);
    await pay(payableId, 2000, null, "2026-09-05");
    await pay(payableId, 3000, null, "2026-09-12");

    const byId = await payableRepo.findByIdWithBiller(adb, payableId);
    expect(byId).not.toBeNull();
    expect(byId?.latestPaidAt).toBe("2026-09-12");
    expect(byId?.paidAmount).toBe(5000);
    expect(byId?.remainingAmount).toBe(5000);
    expect(byId?.displayStatus).toBe("PARTIALLY_PAID");
    expect(byId?.paymentCount).toBe(2);

    const [listed] = await payableRepo.findAllWithBiller(adb, { month: "2026-09-01" });
    expect(listed.id).toBe(payableId);
    expect(byId?.paidAmount).toBe(listed.paidAmount);
    expect(byId?.remainingAmount).toBe(listed.remainingAmount);
    expect(byId?.displayStatus).toBe(listed.displayStatus);
    expect(byId?.paymentCount).toBe(listed.paymentCount);
    expect(byId?.latestPaidAt).toBe(listed.latestPaidAt);

    expect(await payableRepo.findByIdWithBiller(adb, 999999)).toBeNull();
  });

  it("upsertByBillerMonth updates the same (biller, month) row instead of inserting", async () => {
    const { billerId, payableId: firstId } = await payableService.upsertPayable({
      billerName: "Meralco",
      monthIsoAnchor: "2026-09-01",
      amount: 10000,
      status: "UNPAID",
    });

    const secondId = await payableRepo.upsertByBillerMonth(adb, {
      billerId,
      month: "2026-09-01",
      amount: 12000,
      status: "UNPAID",
    });

    expect(secondId).toBe(firstId);

    const rows = await payableRepo.findAllWithBiller(adb, { month: "2026-09-01" });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(12000);
    expect(rows[0].remainingAmount).toBe(12000);
  });

  it("dashboard double-deduct regression: sums remaining, not the full billed amount", async () => {
    const accountId = await insertTestAccount(db, { name: "Wallet", initialBalance: 50000 });
    const payableId = await makePayable("Meralco", "2026-09-01", 10000);
    await pay(payableId, 3000, accountId, "2026-09-10");

    // The payment debit posts exactly once against the wallet.
    const debits = await db.getAllAsync<{ amount: number }>(
      `SELECT amount FROM transactions WHERE accountId = ?`,
      accountId
    );
    const debitTotal = debits.reduce((sum, t) => sum + t.amount, 0);
    expect(debitTotal).toBe(-3000);

    // Unpaid credit is the *remaining* balance, not the full billed amount.
    const unpaid = await payableRepo.sumAllUnpaid(adb);
    expect(unpaid).toBe(7000);
    expect(unpaid).not.toBe(10000);

    // Net position: (wallet balance after debit) − remaining = 47000 − 7000.
    const walletBalance = 50000 + debitTotal;
    expect(walletBalance - unpaid).toBe(40000);
  });
});
