import type { AccountCategory, AccountType, AccountWithBalance } from "../../data/types";

export type AccountRow = Omit<AccountWithBalance, "accountCategory"> & {
  accountCategory: AccountCategory | null;
};

export type AccountEditState = null | {
  mode: "add" | "edit";
  type: AccountType;
  account?: AccountRow;
};

export type SaveAccountInput = {
  mode: "add" | "edit";
  type: AccountType;
  accountId?: number;
  name: string;
  institution: string | null;
  initialBalance: number;
  goalAmount: number | null;
  accountCategory: AccountCategory;
  includeInTotals: 0 | 1;
};

export type BalanceUpdate = {
  id: number;
  balance: number;
};

export type ReconcileResult =
  | { status: "missing" }
  | { status: "matched"; offset: 0 }
  | { status: "reconciled"; offset: number };
