import { getDb } from "../getDb";
import * as dashboardRepo from "../repositories/dashboardRepo";
import { addMonths, isoMonthAnchor, monthStart } from "../../utils/dates";

export type PayablesImpactTrendPoint = {
  month: string;
  unpaid: number;
  net: number;
};

export type PayablesImpactTrend = {
  points: PayablesImpactTrendPoint[];
  startMonth: string;
  endMonth: string;
};

export type DashboardSummary = {
  wallets: number;
  savings: number;
  peopleOwe: number;
  totalFunds: number;
  allTime: { credits: number; net: number };
  currentMonth: { credits: number; net: number };
  threeMonthOutlook: { credits: number; net: number };
  trend: PayablesImpactTrend;
};

export async function loadSnapshot(now = new Date()): Promise<DashboardSummary> {
  const db = await getDb();

  const wallets = await dashboardRepo.sumBalanceByType(db, "SOURCE", true);
  const savings = await dashboardRepo.sumBalanceByType(db, "SAVINGS", true);
  const peopleOwe = await dashboardRepo.sumOwedReceivables(db);
  const totalFunds = wallets + savings + peopleOwe;

  const m0 = isoMonthAnchor(monthStart(now));
  const m2 = isoMonthAnchor(addMonths(monthStart(now), 2));

  const allTimeCredits = await dashboardRepo.sumAllUnpaidPayables(db);
  const currentMonthCredits = await dashboardRepo.sumUnpaidPayablesRange(db, m0, m0);
  const threeMonthOutlookCredits = await dashboardRepo.sumUnpaidPayablesRange(db, m0, m2);

  const [unpaidRows, lastPayableMonth] = await Promise.all([
    dashboardRepo.listUnpaidByMonth(db, m0),
    dashboardRepo.findLastPayableMonth(db, m0),
  ]);

  const trendStartMonth = m0;
  const trendEndMonth = lastPayableMonth ?? m0;
  const unpaidByMonth = new Map(unpaidRows?.map((row) => [row.month, row.unpaid]) ?? []);
  const trend = buildPayablesImpactTrend({
    startMonth: trendStartMonth,
    endMonth: trendEndMonth,
    totalFunds,
    unpaidByMonth,
  });

  return {
    wallets,
    savings,
    peopleOwe,
    totalFunds,
    allTime: { credits: allTimeCredits, net: totalFunds - allTimeCredits },
    currentMonth: {
      credits: currentMonthCredits,
      net: totalFunds - currentMonthCredits,
    },
    threeMonthOutlook: {
      credits: threeMonthOutlookCredits,
      net: totalFunds - threeMonthOutlookCredits,
    },
    trend,
  };
}

export async function getRecentActivity(limit = 5) {
  const db = await getDb();
  return dashboardRepo.recentActivity(db, limit);
}

// ─── Trend helpers ───────────────────────────────────

function buildMonthRange(fromMonth: string, toMonth: string): string[] {
  const start = monthStart(new Date(fromMonth));
  const end = monthStart(new Date(toMonth));
  const months: string[] = [];

  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    months.push(isoMonthAnchor(cursor));
  }

  return months;
}

function buildPayablesImpactTrend(params: {
  startMonth: string;
  endMonth: string;
  totalFunds: number;
  unpaidByMonth: Map<string, number>;
}): PayablesImpactTrend {
  const months = buildMonthRange(params.startMonth, params.endMonth);
  const points = months.map((month) => {
    const unpaid = Math.max(0, params.unpaidByMonth.get(month) ?? 0);
    return {
      month,
      unpaid,
      net: params.totalFunds - unpaid,
    };
  });

  return {
    points,
    startMonth: params.startMonth,
    endMonth: params.endMonth,
  };
}
