import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, type LayoutChangeEvent } from "react-native";

import { loadRecentTransactions } from "../service";
import type { RecentCashflowRow } from "../types";

export type RecentCashflowsPhase = "idle" | "filter_loading" | "loading_more" | "ready" | "error";

type UseRecentCashflowsControllerOptions = {
  pageSize?: number;
};

type FetchRowsOptions = {
  append?: boolean;
  accountId?: number | null;
};

export function useRecentCashflowsController(options?: UseRecentCashflowsControllerOptions) {
  const pageSize = options?.pageSize ?? 10;

  const [filterAccountId, setFilterAccountIdState] = useState<number | null>(null);
  const [rows, setRows] = useState<RecentCashflowRow[]>([]);
  const [phase, setPhase] = useState<RecentCashflowsPhase>("idle");
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reservedBodyMinHeight, setReservedBodyMinHeight] = useState(0);

  const filterAccountIdRef = useRef<number | null>(null);
  const rowsRef = useRef<RecentCashflowRow[]>([]);
  const latestMeasuredBodyHeightRef = useRef(0);
  const isBodyMinHeightLockedRef = useRef(false);
  const latestRequestIdRef = useRef(0);
  const pendingInteractionTaskRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);

  const setFilterAccountId = useCallback((nextFilterAccountId: number | null) => {
    filterAccountIdRef.current = nextFilterAccountId;
    setFilterAccountIdState(nextFilterAccountId);
  }, []);

  const getFilterAccountId = useCallback(() => {
    return filterAccountIdRef.current;
  }, []);

  const fetchRows = useCallback(
    async (options?: FetchRowsOptions) => {
      const append = options?.append ?? false;
      const offset = append ? rowsRef.current.length : 0;
      const nextFilterAccountId =
        options?.accountId === undefined ? filterAccountIdRef.current : options.accountId;
      const requestId = ++latestRequestIdRef.current;

      try {
        if (append) {
          setPhase("loading_more");
        }
        const fetchedRows = await loadRecentTransactions({
          limit: pageSize,
          offset,
          accountId: nextFilterAccountId,
        });

        if (requestId !== latestRequestIdRef.current) return;

        setErrorMessage(null);
        setRows((currentRows) => {
          const nextRows = append ? [...currentRows, ...fetchedRows] : fetchedRows;
          rowsRef.current = nextRows;
          return nextRows;
        });
        setHasMore(fetchedRows.length === pageSize);
        setPhase("ready");
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) return;
        setHasMore(false);
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load recent cashflows."
        );
      }
    },
    [pageSize]
  );

  const refresh = useCallback(
    async (accountId?: number | null) => {
      await fetchRows({ append: false, accountId });
    },
    [fetchRows]
  );

  const cancelPendingFilterTask = useCallback(() => {
    pendingInteractionTaskRef.current?.cancel();
    pendingInteractionTaskRef.current = null;
  }, []);

  const changeFilter = useCallback(
    (nextFilterAccountId: number | null) => {
      setFilterAccountId(nextFilterAccountId);
      setErrorMessage(null);
      setPhase("filter_loading");
      cancelPendingFilterTask();
      pendingInteractionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        void fetchRows({ append: false, accountId: nextFilterAccountId });
      });
    },
    [cancelPendingFilterTask, fetchRows, setFilterAccountId]
  );

  const loadMore = useCallback(() => {
    if (phase === "filter_loading" || phase === "loading_more" || !hasMore) return;
    void fetchRows({ append: true });
  }, [fetchRows, hasMore, phase]);

  const retry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const onBodyLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredHeight = Math.round(event.nativeEvent.layout.height);
    if (measuredHeight <= 0) return;
    latestMeasuredBodyHeightRef.current = measuredHeight;
  }, []);

  const lockBodyMinHeight = useCallback(() => {
    isBodyMinHeightLockedRef.current = true;
    const nextHeight = latestMeasuredBodyHeightRef.current;
    if (nextHeight <= 0) return;
    setReservedBodyMinHeight(nextHeight);
  }, []);

  const releaseBodyMinHeight = useCallback(() => {
    isBodyMinHeightLockedRef.current = false;
    setReservedBodyMinHeight((currentHeight) => (currentHeight === 0 ? currentHeight : 0));
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingFilterTask();
      latestRequestIdRef.current += 1;
    };
  }, [cancelPendingFilterTask]);

  return {
    filterAccountId,
    rows,
    phase,
    hasMore,
    errorMessage,
    reservedBodyMinHeight,
    getFilterAccountId,
    setFilterAccountId,
    refresh,
    changeFilter,
    loadMore,
    retry,
    onBodyLayout,
    lockBodyMinHeight,
    releaseBodyMinHeight,
  };
}
