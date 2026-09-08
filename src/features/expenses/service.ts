import { addMonths, monthStart } from "../../utils/dates";
import { accountService, expenseService, fromCents, toCents } from "../../data";
import type { ExpenseEntry } from "./types";

function getMonthRange(monthAnchor: string) {
  const start = monthStart(new Date(monthAnchor));
  const next = addMonths(start, 1);
  return {
    monthStartIso: start.toISOString().slice(0, 10),
    nextMonthIso: next.toISOString().slice(0, 10),
  };
}

export async function loadExpensesMonth(monthAnchor: string) {
  const { monthStartIso, nextMonthIso } = getMonthRange(monthAnchor);
  const [total, totalsByCategory, entries, categoryRows, eligibleAccounts] = await Promise.all([
    expenseService.sumMonth(monthStartIso, nextMonthIso),
    expenseService.listCategoryTotals(monthStartIso, nextMonthIso),
    expenseService.listByMonth(monthStartIso, nextMonthIso),
    expenseService.listCategories(),
    accountService.listEligibleForExpense(),
  ]);

  return {
    total: fromCents(total ?? 0),
    categoryTotals: (totalsByCategory ?? []).map((row) => ({
      ...row,
      total: fromCents(row.total ?? 0),
    })),
    expenses: (entries ?? []).map((row) => ({
      ...row,
      amount: fromCents(row.amount ?? 0),
    })),
    categories: Array.isArray(categoryRows) ? categoryRows : [],
    eligibleAccounts: (eligibleAccounts ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      institution: row.institution,
      balance: fromCents(row.balance ?? 0),
    })),
  };
}

export async function saveExpense(params: {
  mode: "add" | "edit";
  id?: number;
  dateIso: string;
  amount: number;
  categoryId: number;
  accountId: number | null;
  note: string | null;
}) {
  if (params.mode === "edit" && params.id != null) {
    await expenseService.updateExpense({
      id: params.id,
      dateIso: params.dateIso,
      amount: toCents(params.amount),
      categoryId: params.categoryId,
      accountId: params.accountId,
      note: params.note,
    });
    return;
  }

  await expenseService.addExpense({
    dateIso: params.dateIso,
    amount: toCents(params.amount),
    categoryId: params.categoryId,
    accountId: params.accountId,
    note: params.note,
  });
}

export async function removeExpense(id: number) {
  await expenseService.deleteExpense(id);
}

export async function loadCategories() {
  return expenseService.listCategories();
}

export async function createCategory(name: string) {
  await expenseService.createCategory(name);
}

export async function renameCategory(id: number, name: string) {
  await expenseService.renameCategory(id, name);
}

export async function getCategoryUsageCount(categoryId: number) {
  return expenseService.countCategoryUsage(categoryId);
}

export async function deleteCategory(categoryId: number) {
  const categories = await expenseService.listCategories();
  const fallback = categories.find((category) => category.id !== categoryId);
  if (!fallback) {
    throw new Error("At least one category must remain.");
  }
  await expenseService.deleteCategory(categoryId, fallback.id);
}

export async function reorderCategories(updates: { id: number; sortOrder: number }[]) {
  await expenseService.reorderCategories(updates);
}

export async function deleteCategoryWithReassign(
  categoryId: number,
  destinationCategoryId: number
) {
  await expenseService.deleteCategory(categoryId, destinationCategoryId);
}

export async function loadExpenseEntryById(expenseId: number): Promise<ExpenseEntry | null> {
  const row = await expenseService.getById(expenseId);
  if (!row) return null;
  return {
    ...row,
    amount: fromCents(row.amount),
  };
}
