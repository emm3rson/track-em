import type {
  ExpenseCategoryRow,
  ExpenseCategoryTotal,
  ExpenseWithCategory,
  AccountWithBalance,
} from "../../data/types";

export type ExpenseEntry = Omit<ExpenseWithCategory, "amount"> & { amount: number };
export type CategoryTotal = ExpenseCategoryTotal;
export type ExpenseCategory = ExpenseCategoryRow;
export type ExpenseAccount = Pick<AccountWithBalance, "id" | "name" | "type" | "institution"> & {
  balance: number;
};
export type AmountValidation = { valid: true; value: number } | { valid: false; error: string };
