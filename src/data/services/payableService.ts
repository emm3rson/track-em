import { getDb } from "../getDb";
import * as billerRepo from "../repositories/billerRepo";
import * as payableRepo from "../repositories/payableRepo";
import * as payablePaymentRepo from "../repositories/payablePaymentRepo";
import * as expenseRepo from "../repositories/expenseRepo";
import * as expenseCategoryRepo from "../repositories/expenseCategoryRepo";
import * as transactionRepo from "../repositories/transactionRepo";
import * as accountRepo from "../repositories/accountRepo";
import { type PayableStatus, type PayableWithBiller } from "../types";

// ─── Biller management ───────────────────────────────

export async function listBillers() {
  const db = await getDb();
  return billerRepo.findAllActive(db);
}

export async function listAllBillers() {
  const db = await getDb();
  return billerRepo.findAll(db);
}

// ─── Payable CRUD ────────────────────────────────────

export async function listPayables(filters?: {
  archived?: 0 | 1;
  month?: string;
}): Promise<PayableWithBiller[]> {
  const db = await getDb();
  return payableRepo.findAllWithBiller(db, filters);
}

export async function listStatusTotalsByMonth() {
  const db = await getDb();
  return payableRepo.listStatusTotalsByMonth(db);
}

export async function getPayableById(id: number): Promise<PayableWithBiller | null> {
  const db = await getDb();
  return payableRepo.findByIdWithBiller(db, id);
}

export async function getPaymentByMonthAndBiller(monthIsoAnchor: string, billerName: string) {
  const db = await getDb();
  const payable = await payableRepo.findByMonthAndBiller(db, monthIsoAnchor, billerName);
  if (!payable) return null;

  const payment = await payablePaymentRepo.findLatestByPayableId(db, payable.id);
  if (!payment) return null;

  const detailed = await payablePaymentRepo.findByIdWithDetails(db, payment.id);
  return (
    detailed ?? {
      ...payment,
      accountName: null,
      month: payable.month,
      billerName: payable.billerName,
    }
  );
}

export async function getPaymentTarget(paymentId: number) {
  const db = await getDb();
  const payment = await payablePaymentRepo.findByIdWithDetails(db, paymentId);
  if (!payment) return null;

  return {
    paymentId: payment.id,
    payableId: payment.payableId,
    month: payment.month,
    billerName: payment.billerName,
  };
}

export async function upsertPayable(params: {
  billerName: string;
  monthIsoAnchor: string;
  dueDateIso?: string | null;
  amount: number;
  status: PayableStatus;
  categoryId?: number | null;
  defaultAccountId?: number | null;
}): Promise<{ billerId: number; payableId: number }> {
  if (params.amount < 0) throw new Error("Payable amount must be zero or greater.");
  if (params.dueDateIso) {
    ensureIsoDate(params.dueDateIso, "Due date");
  }

  const db = await getDb();
  const billerId = await billerRepo.findOrCreate(db, {
    name: params.billerName,
    defaultCategoryId: params.categoryId ?? null,
    defaultAccountId: params.defaultAccountId ?? null,
  });

  // Update biller defaults if provided
  if (params.defaultAccountId != null || params.categoryId != null) {
    await billerRepo.update(db, billerId, {
      ...(params.defaultAccountId != null && {
        defaultAccountId: params.defaultAccountId,
      }),
      ...(params.categoryId != null && {
        defaultCategoryId: params.categoryId,
      }),
    });
  }

  const payableId = await payableRepo.upsertByBillerMonth(db, {
    billerId,
    month: params.monthIsoAnchor,
    dueDate: params.dueDateIso ?? null,
    amount: params.amount,
    status: params.status,
    categoryId: params.categoryId ?? null,
  });

  return { billerId, payableId };
}

export async function updatePayable(params: {
  payableId: number;
  billerName: string;
  amount: number;
  monthIsoAnchor: string;
  dueDateIso?: string | null;
  categoryId?: number | null;
  defaultAccountId?: number | null;
}): Promise<void> {
  if (params.amount < 0) throw new Error("Payable amount must be zero or greater.");
  if (params.dueDateIso) {
    ensureIsoDate(params.dueDateIso, "Due date");
  }

  const db = await getDb();
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payable = await payableRepo.findById(db, params.payableId);
    if (!payable) throw new Error("Payable not found.");

    const paidTotal = await payablePaymentRepo.sumByPayableId(db, params.payableId);
    if (params.amount < paidTotal) {
      throw new Error("Payable amount cannot be lower than the total already paid.");
    }

    const billerId = await billerRepo.findOrCreate(db, {
      name: params.billerName,
      defaultCategoryId: params.categoryId ?? null,
      defaultAccountId: params.defaultAccountId ?? null,
    });

    if (params.defaultAccountId != null || params.categoryId != null) {
      await billerRepo.update(db, billerId, {
        ...(params.defaultAccountId != null && {
          defaultAccountId: params.defaultAccountId,
        }),
        ...(params.categoryId != null && {
          defaultCategoryId: params.categoryId,
        }),
      });
    }

    await payableRepo.update(db, params.payableId, {
      billerId,
      month: params.monthIsoAnchor,
      dueDate: params.dueDateIso ?? null,
      amount: params.amount,
      categoryId: params.categoryId ?? null,
    });
    await syncPayableStatus(db, params.payableId);

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

/**
 * Record a payable payment.
 * BUG FIX #1: Uses actual paymentDateIso, NOT the payable's month/dueDate.
 */
export async function recordPayablePayment(params: {
  payableId: number;
  amount: number;
  accountId?: number | null;
  categoryIdOverride?: number | null;
  paymentDateIso: string;
}): Promise<void> {
  if (params.amount <= 0) throw new Error("Amount must be positive.");
  ensureIsoDate(params.paymentDateIso, "Payment date");

  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payableRow = await payableRepo.findById(db, params.payableId);
    if (!payableRow) throw new Error("Payable not found.");

    const biller = await billerRepo.findById(db, payableRow.billerId);
    const paidTotal = await payablePaymentRepo.sumByPayableId(db, params.payableId);
    const remaining = Math.max(0, payableRow.amount - paidTotal);
    if (params.amount > remaining) {
      throw new Error("Payment exceeds remaining balance.");
    }

    // Validate account if provided
    let selectedAccount: { id: number; name: string } | null = null;
    if (params.accountId != null) {
      const acc = await accountRepo.findActiveLinkable(db, params.accountId);
      if (!acc) throw new Error("Selected account is no longer available.");
      selectedAccount = acc;
    }

    // Resolve category: override > payable > biller default > fallback
    const categoryId =
      params.categoryIdOverride ??
      payableRow.categoryId ??
      biller?.defaultCategoryId ??
      (await expenseCategoryRepo.findFallbackId(db));

    const now = new Date().toISOString();
    const billerName = biller?.name ?? "Unknown";
    const monthLabel = payableRow.month.slice(0, 7);
    const note = `Payable: ${billerName} (${monthLabel})`;

    const expenseId = await expenseRepo.insert(db, {
      date: params.paymentDateIso,
      amount: params.amount,
      categoryId,
      accountId: selectedAccount?.id ?? null,
      note,
      createdAt: now,
    });

    const paymentId = await payablePaymentRepo.insert(db, {
      payableId: params.payableId,
      accountId: selectedAccount?.id ?? null,
      expenseId,
      amount: params.amount,
      paidAt: params.paymentDateIso,
      note: null,
      createdAt: now,
    });

    if (selectedAccount) {
      await transactionRepo.upsertLinkedEntry(db, {
        accountId: selectedAccount.id,
        date: params.paymentDateIso,
        amount: -params.amount,
        note,
        kind: "PAYABLE_PAYMENT_LINK",
        linkedId: paymentId,
        createdAt: now,
      });
    }

    await payableRepo.updateCategoryId(db, params.payableId, categoryId);
    await syncPayableStatus(db, params.payableId);

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function updatePayablePayment(params: {
  paymentId: number;
  payableId: number;
  amount: number;
  accountId?: number | null;
  categoryIdOverride?: number | null;
  paymentDateIso: string;
  note?: string | null;
}): Promise<void> {
  if (params.amount <= 0) throw new Error("Amount must be positive.");
  ensureIsoDate(params.paymentDateIso, "Payment date");

  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payable = await payableRepo.findById(db, params.payableId);
    if (!payable) throw new Error("Payable not found.");

    const payment = await payablePaymentRepo.findByIdForPayable(
      db,
      params.paymentId,
      params.payableId
    );
    if (!payment) throw new Error("Payment not found.");

    const currentTotal = await payablePaymentRepo.sumByPayableId(db, params.payableId);
    const remainingTotal = Math.max(0, payable.amount - currentTotal + payment.amount);
    if (params.amount > remainingTotal) {
      throw new Error("Payment exceeds remaining balance.");
    }

    const biller = await billerRepo.findById(db, payable.billerId);

    let selectedAccount: { id: number; name: string } | null = null;
    if (params.accountId != null) {
      const acc = await accountRepo.findActiveLinkable(db, params.accountId);
      if (!acc) throw new Error("Selected account is no longer available.");
      selectedAccount = acc;
    }

    // Resolve category: override > payable > biller default > fallback
    const categoryId =
      params.categoryIdOverride ??
      payable.categoryId ??
      biller?.defaultCategoryId ??
      (await expenseCategoryRepo.findFallbackId(db));

    const billerName = biller?.name ?? "Unknown";
    const monthLabel = payable.month.slice(0, 7);
    const note = `Payable: ${billerName} (${monthLabel})`;

    let expenseId = payment.expenseId ?? null;
    if (payment.expenseId != null) {
      const existingExpense = await expenseRepo.findById(db, payment.expenseId);
      if (existingExpense) {
        await expenseRepo.update(db, payment.expenseId, {
          date: params.paymentDateIso,
          amount: params.amount,
          categoryId,
          accountId: selectedAccount?.id ?? null,
          note: params.note ?? note,
        });
      } else {
        expenseId = null;
      }
    }
    if (expenseId == null) {
      expenseId = await expenseRepo.insert(db, {
        date: params.paymentDateIso,
        amount: params.amount,
        categoryId,
        accountId: selectedAccount?.id ?? null,
        note: params.note ?? note,
        createdAt: new Date().toISOString(),
      });
    }

    await payablePaymentRepo.update(db, payment.id, {
      accountId: selectedAccount?.id ?? null,
      expenseId,
      amount: params.amount,
      paidAt: params.paymentDateIso,
      note: params.note ?? null,
    });

    if (selectedAccount) {
      await transactionRepo.upsertLinkedEntry(db, {
        accountId: selectedAccount.id,
        date: params.paymentDateIso,
        amount: -params.amount,
        note: params.note ?? note,
        kind: "PAYABLE_PAYMENT_LINK",
        linkedId: payment.id,
      });
    } else {
      await transactionRepo.deleteByLinkedPayablePaymentId(db, payment.id);
    }

    await payableRepo.updateCategoryId(db, params.payableId, categoryId);
    await syncPayableStatus(db, params.payableId);

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function deletePayablePayment(params: {
  paymentId: number;
  payableId: number;
}): Promise<void> {
  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payment = await payablePaymentRepo.findByIdForPayable(
      db,
      params.paymentId,
      params.payableId
    );
    if (!payment) throw new Error("Payment not found.");

    await transactionRepo.deleteByLinkedPayablePaymentId(db, payment.id);
    if (payment.expenseId != null) {
      await expenseRepo.deleteById(db, payment.expenseId);
    }
    await payablePaymentRepo.deleteById(db, payment.id);
    await syncPayableStatus(db, params.payableId);

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function listPayments(payableId: number) {
  const db = await getDb();
  return payablePaymentRepo.listByPayableId(db, payableId);
}

export async function getPayment(paymentId: number) {
  const db = await getDb();
  return payablePaymentRepo.findByIdWithDetails(db, paymentId);
}

export async function deletePayable(payableId: number): Promise<void> {
  const db = await getDb();

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const payments = await payablePaymentRepo.listByPayableId(db, payableId);

    for (const payment of payments) {
      await transactionRepo.deleteByLinkedPayablePaymentId(db, payment.id);
      if (payment.expenseId != null) {
        await expenseRepo.deleteById(db, payment.expenseId);
      }
      await payablePaymentRepo.deleteById(db, payment.id);
    }

    await payableRepo.deleteById(db, payableId);
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function duplicateToMonth(
  payableId: number,
  targetMonth: string,
  targetDueDate?: string | null
): Promise<{ billerId: number; payableId: number }> {
  const db = await getDb();
  const source = await payableRepo.findById(db, payableId);
  if (!source) throw new Error("Source payable not found.");

  const newPayableId = await payableRepo.upsertByBillerMonth(db, {
    billerId: source.billerId,
    month: targetMonth,
    dueDate: targetDueDate ?? null,
    amount: source.amount,
    status: "UNPAID",
    categoryId: source.categoryId,
  });

  return { billerId: source.billerId, payableId: newPayableId };
}

// ─── Month archival ──────────────────────────────────

export async function archiveMonth(month: string): Promise<void> {
  const db = await getDb();
  await payableRepo.batchSetArchivedByMonth(db, month, 1);
}

export async function restoreMonth(month: string): Promise<void> {
  const db = await getDb();
  await payableRepo.batchSetArchivedByMonth(db, month, 0);
}

export async function autoArchiveFullyPaidMonths(currentMonth: string): Promise<void> {
  const db = await getDb();
  const months = await payableRepo.listFullyPaidMonths(db, currentMonth);
  for (const month of months) {
    await payableRepo.batchSetArchivedByMonth(db, month, 1);
  }
}

export async function deleteMonth(month: string): Promise<void> {
  const db = await getDb();
  const hasPayments = await payablePaymentRepo.hasPaymentsForMonth(db, month);
  if (hasPayments) {
    throw new Error("Cannot delete a month that has recorded payments.");
  }
  await payableRepo.deleteByMonth(db, month);
}

// ─── Helpers ─────────────────────────────────────────

function ensureIsoDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be in YYYY-MM-DD format.`);
  }
}

async function syncPayableStatus(db: Awaited<ReturnType<typeof getDb>>, payableId: number) {
  const payable = await payableRepo.findById(db, payableId);
  if (!payable) return;

  const paidTotal = await payablePaymentRepo.sumByPayableId(db, payableId);
  const nextStatus: PayableStatus = paidTotal >= payable.amount ? "PAID" : "UNPAID";
  if (payable.status !== nextStatus) {
    await payableRepo.updateStatus(db, payableId, nextStatus);
  }
}
