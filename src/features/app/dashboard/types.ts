import type { AccountType } from "../../../data/types";
import type { LedgerEntryActionTarget, LedgerEntrySourceKind } from "../ledger/types";

export type DashboardTotals = {
  wallets: number;
  savings: number;
  peopleOwe: number;
  totalFunds: number;
};

export type DashboardPayablesImpactWindow = {
  credits: number;
  net: number;
};

export type DashboardPayablesImpactTrendPoint = {
  month: string;
  unpaid: number;
  net: number;
};

export type DashboardPayablesImpactTrend = {
  points: DashboardPayablesImpactTrendPoint[];
  startMonth: string;
  endMonth: string;
};

export type DashboardPayablesImpact = {
  currentMonth: DashboardPayablesImpactWindow;
  threeMonthOutlook: DashboardPayablesImpactWindow;
  allTime: DashboardPayablesImpactWindow;
  trend: DashboardPayablesImpactTrend;
};

export type DashboardCurrentMonthSpending = {
  monthAnchor: string;
  spent: number;
  budget: null;
  subtitle: string;
  progressRatio: number;
};

export type DashboardSavingsBreakdownItem = {
  id: number;
  name: string;
  institution: string | null;
  balance: number;
  goalAmount: number | null;
  accountCategory: string;
  includeInTotals: number;
};

export type DashboardRecentActivitySourceKind = LedgerEntrySourceKind;

export type DashboardRecentActivityItem = {
  key: string;
  id: number;
  accountId: number;
  title: string;
  subtitle: string;
  amount: number;
  sourceKind: DashboardRecentActivitySourceKind;
  note: string | null;
  linkedExpenseId: number | null;
  linkedReceivablePaymentId: number | null;
  linkedPayablePaymentId: number | null;
  transferGroupId: string | null;
  createdAt: string;
  date: string;
  accountName: string;
};

export type TransactionHistoryDatePreset = "LAST_7_DAYS" | "LAST_30_DAYS" | "ALL_TIME" | "CUSTOM";

export type TransactionHistoryAccountFilterOption = {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  institution: string | null;
};

export type TransactionHistoryRow = LedgerEntryActionTarget & {
  accountType: AccountType;
};

export type DashboardSnapshot = {
  totals: DashboardTotals;
  payablesImpact: DashboardPayablesImpact;
  currentMonthSpending: DashboardCurrentMonthSpending;
  savingsBreakdown: DashboardSavingsBreakdownItem[];
  recentActivity: DashboardRecentActivityItem[];
};
