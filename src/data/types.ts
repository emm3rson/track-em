/* eslint-disable @typescript-eslint/no-redeclare */

// ─── Enums ───────────────────────────────────────────

export const AccountType = {
  SOURCE: "SOURCE",
  SAVINGS: "SAVINGS",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountCategory = {
  SAVINGS: "SAVINGS",
  INVESTMENT: "INVESTMENT",
} as const;
export type AccountCategory = (typeof AccountCategory)[keyof typeof AccountCategory];

export const PayableStatus = {
  PAID: "PAID",
  UNPAID: "UNPAID",
} as const;
export type PayableStatus = (typeof PayableStatus)[keyof typeof PayableStatus];

export const PayableDisplayStatus = {
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  UNPAID: "UNPAID",
} as const;
export type PayableDisplayStatus = (typeof PayableDisplayStatus)[keyof typeof PayableDisplayStatus];

export const EntryKind = {
  MANUAL: "MANUAL",
  RECONCILIATION: "RECONCILIATION",
  ADJUSTMENT: "ADJUSTMENT",
  EXPENSE_LINK: "EXPENSE_LINK",
  RECEIVABLE_PAYMENT_LINK: "RECEIVABLE_PAYMENT_LINK",
  PAYABLE_PAYMENT_LINK: "PAYABLE_PAYMENT_LINK",
  LENT_MONEY_LINK: "LENT_MONEY_LINK",
} as const;
export type EntryKind = (typeof EntryKind)[keyof typeof EntryKind];

// ─── Row Types (1:1 with DB columns, all money in integer cents) ─────

export type AccountRow = {
  id: number;
  name: string;
  type: AccountType;
  institution: string | null;
  initialBalance: number;
  goalAmount: number | null;
  accountCategory: AccountCategory | null;
  includeInTotals: number;
  archived: number;
  createdAt: string;
};

export type TransactionRow = {
  id: number;
  accountId: number;
  date: string;
  amount: number;
  entryKind: EntryKind;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  transferGroupId: string | null;
  note: string | null;
  createdAt: string;
};

export type ExpenseCategoryRow = {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type ExpenseRow = {
  id: number;
  date: string;
  amount: number;
  categoryId: number;
  accountId: number | null;
  note: string | null;
  createdAt: string;
};

export type BillerRow = {
  id: number;
  name: string;
  defaultCategoryId: number | null;
  defaultAccountId: number | null;
  archived: number;
  createdAt: string;
};

export type PayableRow = {
  id: number;
  billerId: number;
  month: string;
  dueDate: string | null;
  amount: number;
  status: PayableStatus;
  categoryId: number | null;
  archived: number;
  createdAt: string;
};

export type PayablePaymentRow = {
  id: number;
  payableId: number;
  accountId: number | null;
  expenseId: number | null;
  amount: number;
  paidAt: string;
  note: string | null;
  createdAt: string;
};

export type ReceivableRow = {
  id: number;
  person: string;
  amount: number;
  date: string;
  note: string | null;
  settled: number;
  includeInTotal: number;
  archived: number;
  targetPaymentDate: string | null;
  linkedTransactionId: number | null;
  preferredAccountId: number | null;
  createdAt: string;
};

export type ReceivablePaymentRow = {
  id: number;
  receivableId: number;
  accountId: number | null;
  amount: number;
  note: string | null;
  createdAt: string;
};

// ─── Derived Types (JOIN results) ────────────────────

export type AccountWithBalance = AccountRow & {
  balance: number;
};

export type ExpenseWithCategory = ExpenseRow & {
  categoryName: string;
  accountName: string | null;
  accountType: AccountType | null;
};

export type PayableWithBiller = PayableRow & {
  billerName: string;
  categoryName: string | null;
  defaultAccountId: number | null;
  paidAmount: number;
  remainingAmount: number;
  paymentCount: number;
  latestPaidAt: string | null;
  displayStatus: PayableDisplayStatus;
};

export type ReceivableWithPaid = ReceivableRow & {
  paidAmount: number;
};

export type PayablePaymentWithDetails = PayablePaymentRow & {
  accountName: string | null;
};

export type ReceivablePaymentWithAccount = ReceivablePaymentRow & {
  accountName: string | null;
};

export type ExpenseCategoryTotal = {
  categoryId: number;
  name: string;
  sortOrder: number;
  total: number;
};
