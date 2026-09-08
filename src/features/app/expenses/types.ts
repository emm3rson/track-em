import type {
  CategoryTotal,
  ExpenseAccount,
  ExpenseCategory,
  ExpenseEntry,
} from "../../../features/expenses/types";

export type { CategoryTotal, ExpenseAccount, ExpenseCategory, ExpenseEntry };

export type ExpenseOverview = {
  monthAnchor: string;
  total: number;
  expenseCount: number;
};

export type ExpensesMonthPayload = {
  total: number;
  categoryTotals: CategoryTotal[];
  expenses: ExpenseEntry[];
  categories: ExpenseCategory[];
  eligibleAccounts: ExpenseAccount[];
};
