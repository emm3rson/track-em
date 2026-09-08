import { getDb } from "../getDb";
import * as expenseRepo from "../repositories/expenseRepo";
import * as transactionRepo from "../repositories/transactionRepo";
import * as accountRepo from "../repositories/accountRepo";
import * as expenseCategoryRepo from "../repositories/expenseCategoryRepo";
import * as payablePaymentRepo from "../repositories/payablePaymentRepo";
import { EntryKind } from "../types";
import type { ExpenseCategoryRow, ExpenseCategoryTotal, ExpenseWithCategory } from "../types";

export async function listByMonth(
  monthStart: string,
  nextMonth: string
): Promise<ExpenseWithCategory[]> {
  const db = await getDb();
  return expenseRepo.findByMonth(db, monthStart, nextMonth);
}

export async function listCategoryTotals(
  monthStart: string,
  nextMonth: string
): Promise<ExpenseCategoryTotal[]> {
  const db = await getDb();
  return expenseRepo.sumByMonthAndCategory(db, monthStart, nextMonth);
}

export async function sumMonth(monthStart: string, nextMonth: string): Promise<number> {
  const db = await getDb();
  return expenseRepo.sumByMonth(db, monthStart, nextMonth);
}

export async function addExpense(params: {
  dateIso: string;
  amount: number;
  categoryId: number;
  accountId?: number | null;
  note?: string | null;
}): Promise<number> {
  if (params.amount <= 0) throw new Error("Expense amount must be positive.");
  const db = await getDb();

  if (params.accountId != null) {
    const account = await accountRepo.findActiveLinkable(db, params.accountId);
    if (!account) throw new Error("Account not eligible for expense deductions.");
  }

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const now = new Date().toISOString();
    const expenseId = await expenseRepo.insert(db, {
      date: params.dateIso,
      amount: params.amount,
      categoryId: params.categoryId,
      accountId: params.accountId ?? null,
      note: params.note ?? null,
      createdAt: now,
    });

    if (params.accountId != null) {
      await transactionRepo.insert(db, {
        accountId: params.accountId,
        date: params.dateIso,
        amount: -params.amount,
        entryKind: EntryKind.EXPENSE_LINK,
        linkedExpenseId: expenseId,
        linkedReceivablePaymentId: null,
        linkedPayablePaymentId: null,
        transferGroupId: null,
        note: params.note ?? null,
        createdAt: now,
      });
    }

    await db.execAsync("COMMIT;");
    return expenseId;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function updateExpense(params: {
  id: number;
  dateIso: string;
  amount: number;
  categoryId: number;
  accountId?: number | null;
  note?: string | null;
}): Promise<void> {
  if (params.amount <= 0) throw new Error("Expense amount must be positive.");
  const db = await getDb();

  const previous = await expenseRepo.findById(db, params.id);
  if (!previous) throw new Error("Expense not found.");

  const linkedPayment = await payablePaymentRepo.findByExpenseId(db, params.id);
  if (linkedPayment) {
    throw new Error(
      "This expense was recorded from a bill payment and can only be edited from Obligations (Payables)."
    );
  }

  const linkedTx = await transactionRepo.findByLinkedExpenseId(db, params.id);
  if (linkedTx?.transferGroupId != null) {
    throw new Error(
      "This expense is a transfer fee and can only be edited by deleting and recreating its transfer."
    );
  }

  const nextAccountId = params.accountId ?? null;
  if (nextAccountId != null) {
    const account = await accountRepo.findActiveLinkable(db, nextAccountId);
    if (!account) throw new Error("Account not eligible for expense deductions.");
  }

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    // Reverse old account impact
    if (previous.accountId != null) {
      await transactionRepo.deleteByLinkedExpenseId(db, previous.id);
    }

    // Update the expense
    await expenseRepo.update(db, params.id, {
      date: params.dateIso,
      amount: params.amount,
      categoryId: params.categoryId,
      accountId: nextAccountId,
      note: params.note ?? null,
    });

    // Apply new account impact
    if (nextAccountId != null) {
      await transactionRepo.upsertLinkedEntry(db, {
        accountId: nextAccountId,
        date: params.dateIso,
        amount: -params.amount,
        note: params.note ?? null,
        kind: "EXPENSE_LINK",
        linkedId: params.id,
      });
    }

    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  const existing = await expenseRepo.findById(db, id);
  if (!existing) return;

  const linkedPayment = await payablePaymentRepo.findByExpenseId(db, id);
  if (linkedPayment) {
    throw new Error(
      "This expense was recorded from a bill payment and can only be deleted from Obligations (Payables)."
    );
  }

  const linkedTx = await transactionRepo.findByLinkedExpenseId(db, id);
  if (linkedTx?.transferGroupId != null) {
    throw new Error(
      "This expense is a transfer fee and can only be deleted by deleting its transfer."
    );
  }

  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    if (existing.accountId != null) {
      await transactionRepo.deleteByLinkedExpenseId(db, id);
    }
    await expenseRepo.deleteById(db, id);
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function getById(id: number): Promise<ExpenseWithCategory | null> {
  const db = await getDb();
  return expenseRepo.findByIdWithCategory(db, id);
}

// ─── Category management ─────────────────────────────

export async function listCategories(): Promise<ExpenseCategoryRow[]> {
  const db = await getDb();
  return expenseCategoryRepo.findAll(db);
}

export async function createCategory(name: string): Promise<number> {
  const db = await getDb();
  const maxSort = await expenseCategoryRepo.maxSortOrder(db);
  return expenseCategoryRepo.insert(db, {
    name,
    sortOrder: maxSort + 1,
    createdAt: new Date().toISOString(),
  });
}

export async function countCategoryUsage(id: number): Promise<number> {
  const db = await getDb();
  return expenseRepo.countByCategoryId(db, id);
}

export async function renameCategory(id: number, name: string): Promise<void> {
  const db = await getDb();
  await expenseCategoryRepo.update(db, id, { name });
}

export async function deleteCategory(id: number, reassignToId: number): Promise<void> {
  const db = await getDb();
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    await db.runAsync(`UPDATE expenses SET categoryId = ? WHERE categoryId = ?`, reassignToId, id);
    await db.runAsync(`UPDATE payables SET categoryId = ? WHERE categoryId = ?`, reassignToId, id);
    await db.runAsync(
      `UPDATE billers SET defaultCategoryId = ? WHERE defaultCategoryId = ?`,
      reassignToId,
      id
    );
    await expenseCategoryRepo.deleteById(db, id);
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function reorderCategories(items: { id: number; sortOrder: number }[]): Promise<void> {
  const db = await getDb();
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    await expenseCategoryRepo.reorder(db, items);
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}
