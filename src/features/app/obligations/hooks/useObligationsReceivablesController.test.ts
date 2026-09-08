import { act, renderHook } from "@testing-library/react-native";
import { Alert, ToastAndroid } from "react-native";

import type { ReceivableRow } from "../types";
import { useObligationsReceivablesController } from "./useObligationsReceivablesController";

const mockArchiveReceivable = jest.fn();
const mockDeletePayment = jest.fn();
const mockRecordReceivablePayment = jest.fn();
const mockRestoreArchivedReceivableByUndoingLatestPayment = jest.fn();
const mockRestoreReceivable = jest.fn();
const mockSaveReceivable = jest.fn();
const mockSetReceivableIncludeInTotal = jest.fn();
const mockUpdatePayment = jest.fn();
const mockDeleteReceivableCompletely = jest.fn();
const mockLoadArchivedReceivablesPage = jest.fn();
const mockLoadPayments = jest.fn();
const mockLoadReceivablePaymentAccounts = jest.fn();
const mockLoadReceivableById = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("../../../../features/receivables/service", () => ({
  archiveReceivable: (...args: unknown[]) => mockArchiveReceivable(...args),
  deletePayment: (...args: unknown[]) => mockDeletePayment(...args),
  recordReceivablePayment: (...args: unknown[]) => mockRecordReceivablePayment(...args),
  restoreArchivedReceivableByUndoingLatestPayment: (...args: unknown[]) =>
    mockRestoreArchivedReceivableByUndoingLatestPayment(...args),
  restoreReceivable: (...args: unknown[]) => mockRestoreReceivable(...args),
  saveReceivable: (...args: unknown[]) => mockSaveReceivable(...args),
  setReceivableIncludeInTotal: (...args: unknown[]) => mockSetReceivableIncludeInTotal(...args),
  updatePayment: (...args: unknown[]) => mockUpdatePayment(...args),
  deleteReceivableCompletely: (...args: unknown[]) => mockDeleteReceivableCompletely(...args),
  loadArchivedReceivablesPage: (...args: unknown[]) => mockLoadArchivedReceivablesPage(...args),
  loadPayments: (...args: unknown[]) => mockLoadPayments(...args),
  loadReceivablePaymentAccounts: (...args: unknown[]) => mockLoadReceivablePaymentAccounts(...args),
  loadReceivableById: (...args: unknown[]) => mockLoadReceivableById(...args),
}));

jest.mock("../../../../utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock("lucide-react-native", () => ({
  BanknoteArrowUp: () => null,
  Pencil: () => null,
  CloudAlert: () => null,
  Trash: () => null,
}));

function makeEntry(overrides: Partial<ReceivableRow> = {}): ReceivableRow {
  return {
    id: 7,
    person: "Alex",
    amount: 100,
    date: "2026-04-01",
    note: null,
    settled: 0,
    includeInTotal: 1,
    archived: 1,
    targetPaymentDate: null,
    linkedLedgerEntryId: null,
    preferredAccountId: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    paidAmount: 40,
    ...overrides,
  };
}

describe("useObligationsReceivablesController restore flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(ToastAndroid, "show").mockImplementation(jest.fn());
    mockLoadArchivedReceivablesPage.mockResolvedValue({ rows: [], hasMore: false });
    mockLoadPayments.mockResolvedValue([]);
    mockLoadReceivablePaymentAccounts.mockResolvedValue([]);
    mockRestoreReceivable.mockResolvedValue(undefined);
    mockRestoreArchivedReceivableByUndoingLatestPayment.mockResolvedValue(undefined);
  });

  it("blocks restore for settled archived entries", () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const setSavingPayment = jest.fn();
    const settledEntry = makeEntry({ settled: 1, paidAmount: 100 });

    const { result } = renderHook(() =>
      useObligationsReceivablesController({
        load,
        receivablesRows: [],
        setSavingPayment,
      })
    );

    act(() => {
      result.current.handleRestoreArchivedReceivable(settledEntry);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cannot restore",
      "This receivable is fully settled. It will be re-archived automatically. Delete it if you no longer need it."
    );
    expect(mockRestoreReceivable).not.toHaveBeenCalled();
    expect(mockRestoreArchivedReceivableByUndoingLatestPayment).not.toHaveBeenCalled();
  });

  it("restores a non-settled archived entry without undoing any payment", async () => {
    const load = jest.fn().mockResolvedValue(undefined);
    const setSavingPayment = jest.fn();
    const entry = makeEntry();

    const { result } = renderHook(() =>
      useObligationsReceivablesController({
        load,
        receivablesRows: [],
        setSavingPayment,
      })
    );

    act(() => {
      result.current.handleRestoreArchivedReceivable(entry);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Restore receivable?",
      "This will move the receivable back to the active list.",
      expect.any(Array)
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0]?.[2] as
      | { onPress?: () => Promise<void> | void }[]
      | undefined;

    await act(async () => {
      await buttons?.[1]?.onPress?.();
    });

    expect(mockRestoreReceivable).toHaveBeenCalledWith(entry.id);
    expect(mockRestoreArchivedReceivableByUndoingLatestPayment).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalled();
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      "Receivable restored successfully.",
      ToastAndroid.SHORT
    );
  });
});
