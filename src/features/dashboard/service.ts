import { accountService, dashboardService, fromCents } from "../../data";
import { loadExpensesMonth } from "../expenses/service";
import { loadRecentTransactions } from "../cashflow/service";
import { isoMonthAnchor, monthStart } from "../../utils/dates";
import type { DashboardSummary, AccountBalanceRow } from "./types";
import type { DashboardRecentActivitySourceKind, DashboardSnapshot } from "../app/dashboard/types";

export async function loadDashboardSummary(): Promise<DashboardSummary> {
  const summary = await dashboardService.loadSnapshot();
  return {
    wallets: fromCents(summary.wallets),
    savings: fromCents(summary.savings),
    peopleOwe: fromCents(summary.peopleOwe),
    totalFunds: fromCents(summary.totalFunds),
    allTime: {
      credits: fromCents(summary.allTime.credits),
      net: fromCents(summary.allTime.net),
    },
    currentMonth: {
      credits: fromCents(summary.currentMonth.credits),
      net: fromCents(summary.currentMonth.net),
    },
    threeMonthOutlook: {
      credits: fromCents(summary.threeMonthOutlook.credits),
      net: fromCents(summary.threeMonthOutlook.net),
    },
    trend: {
      points: summary.trend.points.map((point) => ({
        month: point.month,
        unpaid: fromCents(point.unpaid),
        net: fromCents(point.net),
      })),
      startMonth: summary.trend.startMonth,
      endMonth: summary.trend.endMonth,
    },
  };
}

export async function loadAccountsWithBalances(): Promise<AccountBalanceRow[]> {
  const rows = await accountService.listActive();
  return rows.map((row) => ({
    ...row,
    balance: fromCents(row.balance ?? 0),
    goalAmount: row.goalAmount != null ? fromCents(row.goalAmount) : null,
    accountCategory: row.accountCategory ?? (row.type === "SAVINGS" ? "SAVINGS" : null),
    includeInTotals: row.includeInTotals ?? 1,
  }));
}

const RECENT_ACTIVITY_LIMIT = 5;

const SOURCE_LABELS: Record<DashboardRecentActivitySourceKind, string> = {
  MANUAL_ACCOUNT_ENTRY: "Manual entry",
  RECONCILIATION_ACCOUNT_ENTRY: "Balance reconciliation",
  ADJUSTMENT_ACCOUNT_ENTRY: "Balance adjustment",
  EXPENSE_ACCOUNT_ENTRY: "Expense-linked",
  RECEIVABLE_ACCOUNT_ENTRY: "Receivable payment",
  PAYABLE_ACCOUNT_ENTRY: "Payable payment",
  LENT_MONEY_ACCOUNT_ENTRY: "Lent money",
};

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const monthAnchor = isoMonthAnchor(monthStart(new Date()));

  const [summary, expensesMonth, accountRows, recentRows] = await Promise.all([
    loadDashboardSummary(),
    loadExpensesMonth(monthAnchor),
    loadAccountsWithBalances(),
    loadRecentTransactions({
      accountId: null,
      limit: RECENT_ACTIVITY_LIMIT,
      offset: 0,
    }),
  ]);

  const recentActivity = (recentRows ?? []).map((row) => {
    const sourceKind = row.sourceKind as DashboardRecentActivitySourceKind;
    const title = row.note?.trim() ? row.note.trim() : SOURCE_LABELS[sourceKind];

    return {
      key: row.activityKey,
      id: row.id,
      accountId: row.accountId,
      title,
      subtitle: `${row.date} - ${row.accountName}`,
      amount: row.amount ?? 0,
      sourceKind,
      note: row.note ?? null,
      linkedExpenseId: row.linkedExpenseId ?? null,
      linkedReceivablePaymentId: row.linkedReceivablePaymentId ?? null,
      linkedPayablePaymentId: row.linkedPayablePaymentId ?? null,
      transferGroupId: row.transferGroupId ?? null,
      createdAt: row.createdAt,
      date: row.date,
      accountName: row.accountName,
    };
  });

  const savingsBreakdown = (accountRows ?? [])
    .filter((row) => row.type === "SAVINGS" && (row.balance ?? 0) > 0)
    .slice()
    .sort(
      (a, b) =>
        (b.includeInTotals ?? 0) - (a.includeInTotals ?? 0) || (b.balance ?? 0) - (a.balance ?? 0)
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      institution: row.institution ?? null,
      balance: row.balance ?? 0,
      goalAmount: row.goalAmount ?? null,
      accountCategory: row.accountCategory ?? "SAVINGS",
      includeInTotals: row.includeInTotals ?? 1,
    }));

  return {
    totals: {
      wallets: summary.wallets ?? 0,
      savings: summary.savings ?? 0,
      peopleOwe: summary.peopleOwe ?? 0,
      totalFunds: summary.totalFunds ?? 0,
    },
    payablesImpact: {
      currentMonth: {
        credits: summary.currentMonth?.credits ?? 0,
        net: summary.currentMonth?.net ?? 0,
      },
      threeMonthOutlook: {
        credits: summary.threeMonthOutlook?.credits ?? 0,
        net: summary.threeMonthOutlook?.net ?? 0,
      },
      allTime: {
        credits: summary.allTime?.credits ?? 0,
        net: summary.allTime?.net ?? 0,
      },
      trend: {
        points: summary.trend?.points ?? [],
        startMonth: summary.trend?.startMonth ?? monthAnchor,
        endMonth: summary.trend?.endMonth ?? monthAnchor,
      },
    },
    currentMonthSpending: {
      monthAnchor,
      spent: expensesMonth.total ?? 0,
      budget: null,
      subtitle: "No budget set",
      progressRatio: (expensesMonth.total ?? 0) > 0 ? 1 : 0,
    },
    savingsBreakdown,
    recentActivity,
  };
}
