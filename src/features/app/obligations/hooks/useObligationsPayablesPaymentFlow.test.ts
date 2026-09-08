import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useObligationsPayablesPaymentFlow } from "./useObligationsPayablesPaymentFlow";
import type { CreditRow } from "../../../../features/payables/types";

const mockLoadPayablePaymentAccounts = jest.fn();
const mockLoadPayablePaymentByEntry = jest.fn();
const mockLoadPayments = jest.fn();
const mockGetPayment = jest.fn();
const mockRecordPayablePayment = jest.fn();
const mockUpdatePayablePayment = jest.fn();
const mockDeletePayablePayment = jest.fn();
const mockLoadExpenseCategories = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("../../../../features/payables/service", () => ({
  loadPayablePaymentAccounts: (...args: unknown[]) => mockLoadPayablePaymentAccounts(...args),
  loadPayablePaymentByEntry: (...args: unknown[]) => mockLoadPayablePaymentByEntry(...args),
  loadPayments: (...args: unknown[]) => mockLoadPayments(...args),
  getPayment: (...args: unknown[]) => mockGetPayment(...args),
  recordPayablePayment: (...args: unknown[]) => mockRecordPayablePayment(...args),
  updatePayment: (...args: unknown[]) => mockUpdatePayablePayment(...args),
  deletePayment: (...args: unknown[]) => mockDeletePayablePayment(...args),
}));

jest.mock("../../../../features/expenses/service", () => ({
  loadCategories: (...args: unknown[]) => mockLoadExpenseCategories(...args),
}));

jest.mock("../../../../utils/logger", () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

jest.mock("../../../../utils/dates", () => ({
  isoDate: (d: Date) => d.toISOString().slice(0, 10),
}));

function makeCreditRow(overrides: Partial<CreditRow> = {}): CreditRow {
  return {
    id: 1,
    platform: "Netflix",
    month: "2026-04-01",
    amount: 500,
    remainingAmount: 300,
    status: "UNPAID",
    paidAmount: 200,
    paymentCount: 1,
    dueDate: null,
    categoryId: null,
    categoryName: null,
    preferredAccountId: 5,
    latestPaidAt: null,
    ...overrides,
  };
}

function makeByMonth(row: CreditRow) {
  const map = new Map<string, Map<string, CreditRow>>();
  map.set(row.month, new Map([[row.platform, row]]));
  return map;
}

function defaultParams() {
  const row = makeCreditRow();
  return {
    load: jest.fn().mockResolvedValue(undefined),
    byMonth: makeByMonth(row),
    setSavingPayment: jest.fn(),
  };
}

async function openPayablePaymentTarget(
  result: {
    current: ReturnType<typeof useObligationsPayablesPaymentFlow>;
  },
  target: { month: string; platform: string } = { month: "2026-04-01", platform: "Netflix" }
) {
  act(() => {
    result.current.openAddPayablePayment(target);
  });

  await waitFor(() => {
    expect(result.current.loadingPaymentAccounts).toBe(false);
    expect(result.current.loadingPaymentCategories).toBe(false);
  });
}

describe("useObligationsPayablesPaymentFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockLoadPayablePaymentAccounts.mockResolvedValue([]);
    mockLoadPayablePaymentByEntry.mockResolvedValue(null);
    mockLoadPayments.mockResolvedValue([]);
    mockLoadExpenseCategories.mockResolvedValue([]);
    mockGetPayment.mockResolvedValue(null);
  });

  it("addPaymentTarget is null initially", () => {
    const params = defaultParams();
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));
    expect(result.current.addPaymentTarget).toBeNull();
  });

  it("openAddPayablePayment sets addPaymentTarget and loads accounts + categories", async () => {
    const accounts = [{ id: 1, name: "Wallet", type: "SOURCE" }];
    const categories = [{ id: 2, name: "Bills" }];
    mockLoadPayablePaymentAccounts.mockResolvedValue(accounts);
    mockLoadExpenseCategories.mockResolvedValue(categories);
    mockLoadPayablePaymentByEntry.mockResolvedValue(null);

    const params = defaultParams();
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    await openPayablePaymentTarget(result);

    expect(result.current.addPaymentTarget).toEqual({ month: "2026-04-01", platform: "Netflix" });
    expect(result.current.paymentAccounts).toEqual(accounts);
    expect(result.current.paymentCategories).toEqual([{ id: 2, name: "Bills" }]);
  });

  it("selectedAmountPlaceholder reflects byMonth remaining amount for addPaymentTarget", async () => {
    const params = defaultParams();
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    await openPayablePaymentTarget(result);

    // remainingAmount is 300 from the default row
    expect(result.current.selectedAmountPlaceholder).toBe("300");
    expect(result.current.selectedRemainingAmount).toBe(300);
    expect(result.current.selectedPreferredAccountId).toBe(5);
  });

  it("closeAddPaymentModal resets all payment state", async () => {
    const setSavingPayment = jest.fn();
    const params = { ...defaultParams(), setSavingPayment };
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    await openPayablePaymentTarget(result);

    act(() => {
      result.current.closeAddPaymentModal();
    });

    expect(result.current.addPaymentTarget).toBeNull();
    expect(result.current.paymentAccounts).toHaveLength(0);
    expect(setSavingPayment).toHaveBeenCalledWith(false);
  });

  it("openPayablePaymentEditById opens history modal and sets editingPayment", async () => {
    const paymentRow = {
      id: 99,
      payableId: 1,
      amount: 100,
      accountId: null,
      paidAt: "2026-04-05",
      note: null,
    };
    const row = makeCreditRow();
    mockGetPayment.mockResolvedValue(paymentRow);
    mockLoadPayments.mockResolvedValue([paymentRow]);

    const params = {
      load: jest.fn().mockResolvedValue(undefined),
      byMonth: makeByMonth(row),
      setSavingPayment: jest.fn(),
    };
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    let opened = false;
    await act(async () => {
      opened = await result.current.openPayablePaymentEditById(99);
    });

    expect(opened).toBe(true);
    expect(result.current.showPaymentHistoryModal).toBe(true);
    expect(result.current.editingPayment).toEqual(paymentRow);
  });

  it("openPayablePaymentEditById returns false when payment not found", async () => {
    mockGetPayment.mockResolvedValue(null);

    const params = defaultParams();
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    let opened = true;
    await act(async () => {
      opened = await result.current.openPayablePaymentEditById(999);
    });

    expect(opened).toBe(false);
    expect(result.current.showPaymentHistoryModal).toBe(false);
  });

  it("onPaymentTargetInvalidated clears addPaymentTarget if it matches the target", async () => {
    const params = defaultParams();
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    await openPayablePaymentTarget(result);
    expect(result.current.addPaymentTarget).not.toBeNull();

    act(() => {
      result.current.onPaymentTargetInvalidated({ month: "2026-04-01", platform: "Netflix" });
    });
    expect(result.current.addPaymentTarget).toBeNull();
  });

  it("onPaymentTargetInvalidated does not clear addPaymentTarget for a different entry", async () => {
    const params = defaultParams();
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    await openPayablePaymentTarget(result);

    act(() => {
      result.current.onPaymentTargetInvalidated({ month: "2026-04-01", platform: "Spotify" });
    });
    expect(result.current.addPaymentTarget).toEqual({ month: "2026-04-01", platform: "Netflix" });
  });

  it("handleRecordPayablePayment calls setSavingPayment and load on success", async () => {
    mockRecordPayablePayment.mockResolvedValue(undefined);
    const load = jest.fn().mockResolvedValue(undefined);
    const setSavingPayment = jest.fn();
    const params = { load, byMonth: makeByMonth(makeCreditRow()), setSavingPayment };
    const { result } = renderHook(() => useObligationsPayablesPaymentFlow(params));

    await openPayablePaymentTarget(result);

    await act(async () => {
      await result.current.handleRecordPayablePayment(300, null);
    });

    expect(mockRecordPayablePayment).toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(result.current.addPaymentTarget).toBeNull();
  });
});
