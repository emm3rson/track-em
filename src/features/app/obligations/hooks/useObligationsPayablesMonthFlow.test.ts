import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  parseCustomMonthInput,
  useObligationsPayablesMonthFlow,
} from "./useObligationsPayablesMonthFlow";
import type { CreditRow } from "../../../../features/payables/types";

const mockNavigation = { navigate: jest.fn() };
const mockArchivePayablesMonth = jest.fn();
const mockRestorePayablesMonth = jest.fn();
const mockDeletePayablesMonth = jest.fn();
const mockDuplicatePayableToNextMonth = jest.fn();
const mockCopyPayableToNextMonthReplace = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock("../../../../features/payables/service", () => ({
  archiveMonth: (...args: unknown[]) => mockArchivePayablesMonth(...args),
  restoreMonth: (...args: unknown[]) => mockRestorePayablesMonth(...args),
  deletePayablesMonth: (...args: unknown[]) => mockDeletePayablesMonth(...args),
  duplicatePayableToNextMonth: (...args: unknown[]) => mockDuplicatePayableToNextMonth(...args),
  copyPayableToNextMonthReplace: (...args: unknown[]) => mockCopyPayableToNextMonthReplace(...args),
  duplicatePayableToMonth: jest.fn(),
}));

jest.mock("../../../../utils/logger", () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

jest.mock("../../../../utils/dates", () => ({
  formatMonthLabel: (m: string) => m,
  isoMonthAnchor: (d: Date) => d.toISOString().slice(0, 10) + "-01".slice(0, 3),
  addMonths: (d: Date, n: number) => {
    const next = new Date(d);
    next.setMonth(next.getMonth() + n);
    return next;
  },
}));

jest.mock("lucide-react-native", () => ({
  Copy: () => null,
  CreditCard: () => null,
  Trash: () => null,
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

function defaultParams() {
  const row = makeCreditRow();
  const byMonth = new Map([["2026-04-01", new Map([["Netflix", row]])]]);
  return {
    load: jest.fn().mockResolvedValue(undefined),
    scrollRef: { current: null },
    months: ["2026-04-01"],
    archivedMonths: [],
    byMonth,
    autoArchivedSet: new Set<string>(),
    currentMonthAnchor: "2026-04-01",
    nextMonthAnchor: "2026-05-01",
  };
}

describe("parseCustomMonthInput", () => {
  it("accepts YYYY-MM format", () => {
    expect(parseCustomMonthInput("2026-04")).toBe("2026-04-01");
  });

  it("accepts YYYY-MM-DD format (strips day)", () => {
    expect(parseCustomMonthInput("2026-04-15")).toBe("2026-04-01");
  });

  it("rejects invalid month 00", () => {
    expect(parseCustomMonthInput("2026-00")).toBeNull();
  });

  it("rejects invalid month 13", () => {
    expect(parseCustomMonthInput("2026-13")).toBeNull();
  });

  it("rejects free text", () => {
    expect(parseCustomMonthInput("april 2026")).toBeNull();
  });

  it("trims whitespace before parsing", () => {
    expect(parseCustomMonthInput("  2026-04  ")).toBe("2026-04-01");
  });
});

describe("useObligationsPayablesMonthFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("archiveMonthAction calls service and reloads", async () => {
    mockArchivePayablesMonth.mockResolvedValue(undefined);
    const load = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useObligationsPayablesMonthFlow({ ...defaultParams(), load })
    );

    act(() => {
      result.current.confirmArchiveMonth("2026-04-01");
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0]?.[2] as
      | { onPress?: () => Promise<void> | void }[]
      | undefined;

    await act(async () => {
      await buttons?.[1]?.onPress?.();
    });

    expect(mockArchivePayablesMonth).toHaveBeenCalledWith("2026-04-01");
    expect(load).toHaveBeenCalled();
  });

  it("restoreMonthAction calls service and reloads", async () => {
    mockRestorePayablesMonth.mockResolvedValue(undefined);
    const load = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useObligationsPayablesMonthFlow({ ...defaultParams(), load })
    );

    await act(async () => {
      await result.current.restoreMonthAction("2026-04-01");
    });

    expect(mockRestorePayablesMonth).toHaveBeenCalledWith("2026-04-01");
    expect(load).toHaveBeenCalled();
  });

  it("restoreMonthAction does nothing for auto-archived months", async () => {
    const autoArchivedSet = new Set(["2026-04-01"]);
    const load = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useObligationsPayablesMonthFlow({ ...defaultParams(), load, autoArchivedSet })
    );

    await act(async () => {
      await result.current.restoreMonthAction("2026-04-01");
    });

    expect(mockRestorePayablesMonth).not.toHaveBeenCalled();
  });

  it("handleDeleteArchivedMonth shows confirm alert and deletes on confirm", async () => {
    mockDeletePayablesMonth.mockResolvedValue(undefined);
    const load = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useObligationsPayablesMonthFlow({ ...defaultParams(), load })
    );

    act(() => {
      result.current.handleDeleteArchivedMonth("2026-04-01");
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0]?.[2] as
      | { onPress?: () => Promise<void> | void }[]
      | undefined;

    await act(async () => {
      await buttons?.[1]?.onPress?.();
    });

    expect(mockDeletePayablesMonth).toHaveBeenCalledWith("2026-04-01");
    expect(load).toHaveBeenCalled();
  });

  it("onAddMonth opens the add month modal", () => {
    const { result } = renderHook(() => useObligationsPayablesMonthFlow(defaultParams()));

    act(() => {
      void result.current.onAddMonth();
    });

    expect(result.current.showAddMonthModal).toBe(true);
  });

  it("onAddCurrentMonth navigates to EntryAddPayable with currentMonthAnchor", async () => {
    const { result } = renderHook(() => useObligationsPayablesMonthFlow(defaultParams()));

    await act(async () => {
      await result.current.onAddCurrentMonth();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("EntryAddPayable", {
      defaultMonth: "2026-04-01",
    });
  });
});
