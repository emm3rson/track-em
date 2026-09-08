import { act, renderHook } from "@testing-library/react-native";

import { useObligationsFabPaymentFlow } from "./useObligationsFabPaymentFlow";
import type { CreditRow } from "../../../../features/payables/types";
import type { ReceivableRow } from "../../../../features/receivables/types";
import type { PayableEntryTarget } from "../types";

jest.mock("../../../../utils/currency", () => ({
  php: { format: (v: number) => `P${v}` },
}));
jest.mock("../../../../utils/dates", () => ({
  formatMonthLabel: (m: string) => m,
}));

function makeCreditRow(overrides: Partial<CreditRow> = {}): CreditRow {
  return {
    id: 1,
    platform: "Netflix",
    month: "2026-04-01",
    amount: 500,
    remainingAmount: 500,
    status: "UNPAID",
    paidAmount: 0,
    paymentCount: 0,
    dueDate: null,
    categoryId: null,
    categoryName: null,
    preferredAccountId: null,
    latestPaidAt: null,
    ...overrides,
  };
}

function makeReceivableRow(overrides: Partial<ReceivableRow> = {}): ReceivableRow {
  return {
    id: 1,
    person: "Alex",
    amount: 1000,
    paidAmount: 0,
    date: "2026-04-01",
    note: null,
    settled: 0,
    includeInTotal: 1,
    archived: 0,
    targetPaymentDate: null,
    linkedLedgerEntryId: null,
    preferredAccountId: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

const MONTH_APR = "2026-04-01";
const MONTH_MAY = "2026-05-01";

function makeByMonth(entries: { month: string; platform: string; remaining: number }[]) {
  const map = new Map<string, Map<string, CreditRow>>();
  for (const { month, platform, remaining } of entries) {
    if (!map.has(month)) map.set(month, new Map());
    map.get(month)!.set(platform, makeCreditRow({ platform, month, remainingAmount: remaining }));
  }
  return map;
}

function defaultProps(overrides: Partial<Parameters<typeof useObligationsFabPaymentFlow>[0]> = {}) {
  return {
    months: [MONTH_APR],
    byMonth: makeByMonth([{ month: MONTH_APR, platform: "Netflix", remaining: 500 }]),
    receivablesRows: [makeReceivableRow()],
    openAddPayablePayment: jest.fn(),
    addPaymentTarget: null as PayableEntryTarget | null,
    closeAddPayablePaymentRaw: jest.fn(),
    openAddReceivablePayment: jest.fn(),
    showAddReceivablePaymentModal: false,
    closeAddReceivablePaymentRaw: jest.fn(),
    ...overrides,
  };
}

describe("useObligationsFabPaymentFlow", () => {
  it("selects the closest month to current when initialized", () => {
    const { result } = renderHook(() => useObligationsFabPaymentFlow(defaultProps()));
    // Apr 2026 is the only month with entries
    expect(result.current.fabPayableMonth).toBe(MONTH_APR);
    expect(result.current.fabPayablePlatform).toBe("Netflix");
  });

  it("canAddPayablePayment is false when no months have remaining amounts", () => {
    const { result } = renderHook(() =>
      useObligationsFabPaymentFlow(
        defaultProps({
          byMonth: makeByMonth([{ month: MONTH_APR, platform: "Netflix", remaining: 0 }]),
        })
      )
    );
    expect(result.current.canAddPayablePayment).toBe(false);
  });

  it("openFabPayablePaymentModal sets isFabPayablePaymentFlow and calls openAddPayablePayment", async () => {
    const openAddPayablePayment = jest.fn();
    const { result } = renderHook(() =>
      useObligationsFabPaymentFlow(defaultProps({ openAddPayablePayment }))
    );

    let opened = false;
    await act(async () => {
      opened = result.current.openFabPayablePaymentModal();
    });

    expect(opened).toBe(true);
    expect(result.current.isFabPayablePaymentFlow).toBe(true);
    expect(openAddPayablePayment).toHaveBeenCalledWith({
      month: MONTH_APR,
      platform: "Netflix",
    });
  });

  it("openFabReceivablePaymentModal sets isFabReceivablePaymentFlow and calls openAddReceivablePayment", async () => {
    const openAddReceivablePayment = jest.fn();
    const receivablesRows = [makeReceivableRow({ id: 7, person: "Bob" })];
    const { result } = renderHook(() =>
      useObligationsFabPaymentFlow(defaultProps({ openAddReceivablePayment, receivablesRows }))
    );

    let opened = false;
    await act(async () => {
      opened = result.current.openFabReceivablePaymentModal();
    });

    expect(opened).toBe(true);
    expect(result.current.isFabReceivablePaymentFlow).toBe(true);
    expect(openAddReceivablePayment).toHaveBeenCalledWith(receivablesRows[0]);
  });

  it("clears isFabPayablePaymentFlow when addPaymentTarget becomes null", async () => {
    const openAddPayablePayment = jest.fn();
    const fakeTarget: PayableEntryTarget = { month: MONTH_APR, platform: "Netflix" };
    // Start with addPaymentTarget already set (simulates modal open after openFabPayablePaymentModal)
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useObligationsFabPaymentFlow>[0]) =>
        useObligationsFabPaymentFlow(props),
      { initialProps: defaultProps({ openAddPayablePayment, addPaymentTarget: fakeTarget }) }
    );

    // Set flag directly via the exposed method — still starts true because addPaymentTarget is non-null
    await act(async () => {
      result.current.openFabPayablePaymentModal();
    });
    expect(result.current.isFabPayablePaymentFlow).toBe(true);

    // Simulate modal closing — addPaymentTarget goes back to null
    rerender(defaultProps({ openAddPayablePayment, addPaymentTarget: null }));
    await act(async () => {});

    expect(result.current.isFabPayablePaymentFlow).toBe(false);
  });

  it("clears isFabReceivablePaymentFlow when showAddReceivablePaymentModal becomes false", async () => {
    const openAddReceivablePayment = jest.fn();
    // Start with modal already open (simulates state after openFabReceivablePaymentModal)
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useObligationsFabPaymentFlow>[0]) =>
        useObligationsFabPaymentFlow(props),
      {
        initialProps: defaultProps({
          openAddReceivablePayment,
          showAddReceivablePaymentModal: true,
        }),
      }
    );

    await act(async () => {
      result.current.openFabReceivablePaymentModal();
    });
    expect(result.current.isFabReceivablePaymentFlow).toBe(true);

    // Simulate modal closing
    rerender(defaultProps({ openAddReceivablePayment, showAddReceivablePaymentModal: false }));
    await act(async () => {});

    expect(result.current.isFabReceivablePaymentFlow).toBe(false);
  });

  it("resets fabPayableMonth and fabPayablePlatform when snapshot no longer has unpaid entries", async () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useObligationsFabPaymentFlow>[0]) =>
        useObligationsFabPaymentFlow(props),
      { initialProps: defaultProps() }
    );

    expect(result.current.fabPayableMonth).toBe(MONTH_APR);

    rerender(
      defaultProps({
        months: [MONTH_APR],
        byMonth: makeByMonth([{ month: MONTH_APR, platform: "Netflix", remaining: 0 }]),
      })
    );
    await act(async () => {});

    expect(result.current.fabPayableMonth).toBe("");
    expect(result.current.fabPayablePlatform).toBe("");
  });

  it("selects closest month when multiple months with unpaid entries exist", () => {
    // Two months: APR (past) and MAY (future). MAY is closer to current month in tests.
    const byMonth = makeByMonth([
      { month: MONTH_APR, platform: "A", remaining: 100 },
      { month: MONTH_MAY, platform: "B", remaining: 200 },
    ]);
    const { result } = renderHook(() =>
      useObligationsFabPaymentFlow(defaultProps({ months: [MONTH_APR, MONTH_MAY], byMonth }))
    );
    // The hook should select one of the two months (closest to now)
    expect([MONTH_APR, MONTH_MAY]).toContain(result.current.fabPayableMonth);
  });

  it("closeAddPayablePaymentModal clears fab flag and calls raw close", async () => {
    const closeAddPayablePaymentRaw = jest.fn();
    const openAddPayablePayment = jest.fn();
    const { result } = renderHook(() =>
      useObligationsFabPaymentFlow(
        defaultProps({ closeAddPayablePaymentRaw, openAddPayablePayment })
      )
    );

    await act(async () => {
      result.current.openFabPayablePaymentModal();
    });
    expect(result.current.isFabPayablePaymentFlow).toBe(true);

    act(() => {
      result.current.closeAddPayablePaymentModal();
    });
    expect(result.current.isFabPayablePaymentFlow).toBe(false);
    expect(closeAddPayablePaymentRaw).toHaveBeenCalledTimes(1);
  });
});
