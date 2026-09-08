import { useCallback, useState } from "react";
import { loadDashboardSummary, loadAccountsWithBalances } from "./service";
import type { DashboardSummary, AccountBalanceRow } from "./types";
import { logger } from "../../utils/logger";

export function useDashboardData() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        // If we already have data, don't show full loading state on refocus,
        // but maybe we should? The original code didn't have loading state at all for focus.
        // We'll stick to 'loading' only for initial mount or explicit refresh if needed.
        // For now, let's just use refreshing for manual, and loading for initial.
      }

      const [sum, accs] = await Promise.all([loadDashboardSummary(), loadAccountsWithBalances()]);

      setSummary(sum);
      setAccounts(accs);
    } catch (error) {
      logger.error("dashboard", "Failed to load dashboard data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  return { summary, accounts, loading, refreshing, load };
}
