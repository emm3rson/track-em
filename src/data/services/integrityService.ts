import { getDb } from "../getDb";
import type { Db } from "../db";

export type DbInvariantIssue = {
  code: string;
  count: number;
};

export type DbInvariantReport = {
  ok: boolean;
  issues: DbInvariantIssue[];
};

async function countQuery(db: Db, sql: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(sql);
  return row?.total ?? 0;
}

export async function verify(dbMaybe?: Db): Promise<DbInvariantReport> {
  const db = dbMaybe ?? (await getDb());
  const issues: DbInvariantIssue[] = [];

  // Multi-linked transactions
  const multiLink = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM transactions WHERE (
      (CASE WHEN linkedExpenseId IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN linkedReceivablePaymentId IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN linkedPayablePaymentId IS NOT NULL THEN 1 ELSE 0 END)
    ) > 1`
  );
  if (multiLink > 0) issues.push({ code: "MULTI_LINKED_TRANSACTIONS", count: multiLink });

  // Non-positive amounts
  const badExpenses = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM expenses WHERE amount <= 0`
  );
  if (badExpenses > 0) issues.push({ code: "NON_POSITIVE_EXPENSE_AMOUNTS", count: badExpenses });

  const badRecPayments = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM receivable_payments WHERE amount <= 0`
  );
  if (badRecPayments > 0)
    issues.push({ code: "NON_POSITIVE_RECEIVABLE_PAYMENTS", count: badRecPayments });

  const badPayPayments = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payable_payments WHERE amount <= 0`
  );
  if (badPayPayments > 0)
    issues.push({ code: "NON_POSITIVE_PAYABLE_PAYMENTS", count: badPayPayments });

  // Orphan transactions (account missing)
  const orphanTx = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM transactions t LEFT JOIN accounts a ON a.id = t.accountId WHERE a.id IS NULL`
  );
  if (orphanTx > 0) issues.push({ code: "ORPHAN_TRANSACTIONS", count: orphanTx });

  // Orphan receivable payments
  const orphanRecPay = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM receivable_payments rp LEFT JOIN receivables r ON r.id = rp.receivableId WHERE r.id IS NULL`
  );
  if (orphanRecPay > 0) issues.push({ code: "ORPHAN_RECEIVABLE_PAYMENTS", count: orphanRecPay });

  // Orphan payable payments (payable missing)
  const orphanPayPay = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payable_payments pp LEFT JOIN payables p ON p.id = pp.payableId WHERE p.id IS NULL`
  );
  if (orphanPayPay > 0) issues.push({ code: "ORPHAN_PAYABLE_PAYMENTS", count: orphanPayPay });

  // Orphan payable account links
  const orphanPayAccounts = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payable_payments pp LEFT JOIN accounts a ON a.id = pp.accountId WHERE pp.accountId IS NOT NULL AND a.id IS NULL`
  );
  if (orphanPayAccounts > 0)
    issues.push({ code: "ORPHAN_PAYABLE_ACCOUNT_LINKS", count: orphanPayAccounts });

  // Orphan payable expense links
  const orphanPayExpenses = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payable_payments pp LEFT JOIN expenses e ON e.id = pp.expenseId WHERE pp.expenseId IS NOT NULL AND e.id IS NULL`
  );
  if (orphanPayExpenses > 0)
    issues.push({ code: "ORPHAN_PAYABLE_EXPENSE_LINKS", count: orphanPayExpenses });

  // Paid payables missing expense
  const paidMissingExpense = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payables p
     LEFT JOIN payable_payments pp ON pp.payableId = p.id
     WHERE p.status = 'PAID' AND (pp.id IS NULL OR pp.expenseId IS NULL)`
  );
  if (paidMissingExpense > 0)
    issues.push({ code: "PAID_PAYABLES_MISSING_EXPENSE", count: paidMissingExpense });

  // Invalid payable due dates
  const invalidDueDates = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payables
     WHERE dueDate IS NOT NULL AND trim(COALESCE(dueDate, '')) != ''
       AND dueDate NOT GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`
  );
  if (invalidDueDates > 0)
    issues.push({ code: "INVALID_PAYABLE_DUE_DATES", count: invalidDueDates });

  // Orphan expense categories
  const orphanExpCat = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM expenses e LEFT JOIN expense_categories c ON c.id = e.categoryId WHERE c.id IS NULL`
  );
  if (orphanExpCat > 0) issues.push({ code: "ORPHAN_EXPENSE_CATEGORIES", count: orphanExpCat });

  // Orphan billers
  const orphanBillers = await countQuery(
    db,
    `SELECT COUNT(*) AS total FROM payables p LEFT JOIN billers b ON b.id = p.billerId WHERE b.id IS NULL`
  );
  if (orphanBillers > 0) issues.push({ code: "ORPHAN_PAYABLE_BILLERS", count: orphanBillers });

  // Duplicate linked entries
  for (const col of [
    "linkedExpenseId",
    "linkedReceivablePaymentId",
    "linkedPayablePaymentId",
  ] as const) {
    const dupes = await countQuery(
      db,
      `SELECT COUNT(*) AS total FROM (
        SELECT ${col} FROM transactions WHERE ${col} IS NOT NULL
        GROUP BY ${col} HAVING COUNT(*) > 1
      ) duplicates`
    );
    if (dupes > 0) {
      const code = `DUPLICATE_${col.replace("linked", "").replace("Id", "").toUpperCase()}_LINK`;
      issues.push({ code, count: dupes });
    }
  }

  return { ok: issues.length === 0, issues };
}
