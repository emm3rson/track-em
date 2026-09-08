import type { AccountRow } from "../accounts/types";

export type DashboardSummary = {
  wallets: number;
  savings: number;
  peopleOwe: number;
  totalFunds: number;
  allTime: { credits: number; net: number };
  currentMonth: { credits: number; net: number };
  threeMonthOutlook: { credits: number; net: number };
  trend: {
    points: { month: string; unpaid: number; net: number }[];
    startMonth: string;
    endMonth: string;
  };
};

export type AccountBalanceRow = AccountRow;
