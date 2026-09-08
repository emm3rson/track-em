const mockExecAsync = jest.fn();
const mockFindById = jest.fn();
const mockSetArchived = jest.fn();
const mockSetSettled = jest.fn();
const mockSumByReceivableId = jest.fn();
const mockFindAllWithPaid = jest.fn();
const mockCountArchived = jest.fn();
const mockFindFullyPaidUnsettled = jest.fn();
const mockInsertReceivable = jest.fn();
const mockUpdateReceivable = jest.fn();
const mockListAllByReceivableId = jest.fn();
const mockListByReceivableId = jest.fn();
const mockFindByIdForReceivable = jest.fn();
const mockInsertReceivablePayment = jest.fn();
const mockUpdateReceivablePayment = jest.fn();
const mockDeleteLinkedTx = jest.fn();
const mockDeleteReceivablePaymentById = jest.fn();
const mockDeleteReceivableById = jest.fn();
const mockFindTxById = jest.fn();
const mockUpdateTx = jest.fn();
const mockFindActiveLinkable = jest.fn();

jest.mock("../getDb", () => ({
  getDb: jest.fn(async () => ({
    execAsync: (...args: unknown[]) => mockExecAsync(...args),
  })),
}));

jest.mock("../repositories/receivableRepo", () => ({
  findById: (...args: unknown[]) => mockFindById(...args),
  setArchived: (...args: unknown[]) => mockSetArchived(...args),
  setSettled: (...args: unknown[]) => mockSetSettled(...args),
  findAllWithPaid: (...args: unknown[]) => mockFindAllWithPaid(...args),
  countArchived: (...args: unknown[]) => mockCountArchived(...args),
  findFullyPaidUnsettled: (...args: unknown[]) => mockFindFullyPaidUnsettled(...args),
  insert: (...args: unknown[]) => mockInsertReceivable(...args),
  deleteById: (...args: unknown[]) => mockDeleteReceivableById(...args),
  findByLinkedTransactionId: jest.fn(),
  setIncludeInTotal: jest.fn(),
  sumOwed: jest.fn(),
  update: (...args: unknown[]) => mockUpdateReceivable(...args),
}));

jest.mock("../repositories/receivablePaymentRepo", () => ({
  sumByReceivableId: (...args: unknown[]) => mockSumByReceivableId(...args),
  listAllByReceivableId: (...args: unknown[]) => mockListAllByReceivableId(...args),
  listByReceivableId: (...args: unknown[]) => mockListByReceivableId(...args),
  findByIdForReceivable: (...args: unknown[]) => mockFindByIdForReceivable(...args),
  deleteById: (...args: unknown[]) => mockDeleteReceivablePaymentById(...args),
  insert: (...args: unknown[]) => mockInsertReceivablePayment(...args),
  update: (...args: unknown[]) => mockUpdateReceivablePayment(...args),
  findByIdWithAccount: jest.fn(),
}));

jest.mock("../repositories/transactionRepo", () => ({
  insert: jest.fn(),
  findById: (...args: unknown[]) => mockFindTxById(...args),
  update: (...args: unknown[]) => mockUpdateTx(...args),
  deleteByLinkedReceivablePaymentId: (...args: unknown[]) => mockDeleteLinkedTx(...args),
  deleteById: jest.fn(),
  upsertLinkedEntry: jest.fn(),
}));

jest.mock("../repositories/accountRepo", () => ({
  findActiveLinkable: (...args: unknown[]) => mockFindActiveLinkable(...args),
}));

import {
  archiveReceivable,
  recordPayment,
  restoreReceivable,
  updatePayment,
  updateReceivable,
} from "./receivableService";

beforeEach(() => {
  jest.clearAllMocks();
  mockExecAsync.mockResolvedValue(undefined);
});

describe("archiveReceivable", () => {
  it("sets archived to 1 without touching payments", async () => {
    mockSetArchived.mockResolvedValue(undefined);

    await archiveReceivable(42);

    expect(mockSetArchived).toHaveBeenCalledWith(expect.anything(), 42, 1);
    expect(mockDeleteReceivablePaymentById).not.toHaveBeenCalled();
    expect(mockDeleteLinkedTx).not.toHaveBeenCalled();
  });
});

describe("restoreReceivable", () => {
  it("sets archived to 0 without deleting any payment rows", async () => {
    mockSetArchived.mockResolvedValue(undefined);

    await restoreReceivable(42);

    expect(mockSetArchived).toHaveBeenCalledWith(expect.anything(), 42, 0);
    expect(mockDeleteReceivablePaymentById).not.toHaveBeenCalled();
    expect(mockDeleteLinkedTx).not.toHaveBeenCalled();
  });

  it("does not alter settled state on restore", async () => {
    mockSetArchived.mockResolvedValue(undefined);

    await restoreReceivable(42);

    expect(mockSetSettled).not.toHaveBeenCalled();
  });
});

describe("archive -> restore round trip", () => {
  it("archive then restore leaves payment rows untouched", async () => {
    mockSetArchived.mockResolvedValue(undefined);

    await archiveReceivable(7);
    await restoreReceivable(7);

    expect(mockDeleteReceivablePaymentById).not.toHaveBeenCalled();
    expect(mockDeleteLinkedTx).not.toHaveBeenCalled();
    expect(mockSetArchived).toHaveBeenNthCalledWith(1, expect.anything(), 7, 1);
    expect(mockSetArchived).toHaveBeenNthCalledWith(2, expect.anything(), 7, 0);
  });
});

describe("restoreReceivable on a settled entry", () => {
  it("still sets archived to 0 because settled guards live outside the data service", async () => {
    mockSetArchived.mockResolvedValue(undefined);

    await restoreReceivable(99);

    expect(mockSetArchived).toHaveBeenCalledWith(expect.anything(), 99, 0);
    expect(mockDeleteReceivablePaymentById).not.toHaveBeenCalled();
  });
});

describe("recordPayment remaining-balance guard", () => {
  it("rejects a payment that exceeds the remaining balance", async () => {
    mockFindById.mockResolvedValue({ id: 5, amount: 10000, linkedTransactionId: null });
    mockSumByReceivableId.mockResolvedValue(9000);

    await expect(recordPayment({ receivableId: 5, amount: 2000, person: "Ana" })).rejects.toThrow(
      "Payment exceeds remaining balance."
    );

    expect(mockInsertReceivablePayment).not.toHaveBeenCalled();
  });
});

describe("updatePayment remaining-balance guard", () => {
  it("rejects raising a payment above the remaining balance", async () => {
    mockFindByIdForReceivable.mockResolvedValue({
      id: 11,
      receivableId: 5,
      amount: 1000,
      accountId: null,
    });
    mockFindById.mockResolvedValue({ id: 5, amount: 10000, linkedTransactionId: null });
    mockSumByReceivableId.mockResolvedValue(9000);

    await expect(
      updatePayment({ paymentId: 11, receivableId: 5, amount: 3000, person: "Ana" })
    ).rejects.toThrow("Payment exceeds remaining balance.");

    expect(mockUpdateReceivablePayment).not.toHaveBeenCalled();
  });
});

describe("updateReceivable invariants", () => {
  it("rejects lowering the principal below the total already paid", async () => {
    mockFindById.mockResolvedValue({ id: 5, amount: 10000, linkedTransactionId: null });
    mockSumByReceivableId.mockResolvedValue(9000);

    await expect(updateReceivable(5, { amount: 8000 })).rejects.toThrow(
      "cannot be lower than the total already paid"
    );

    expect(mockUpdateReceivable).not.toHaveBeenCalled();
  });

  it("syncs the lent-money ledger transaction on amount/date edits", async () => {
    mockFindById.mockResolvedValue({ id: 5, amount: 10000, linkedTransactionId: 77 });
    mockSumByReceivableId.mockResolvedValue(0);
    mockFindTxById.mockResolvedValue({ id: 77, amount: -10000 });

    await updateReceivable(5, { amount: 9000, date: "2026-05-02" });

    expect(mockUpdateReceivable).toHaveBeenCalled();
    expect(mockUpdateTx).toHaveBeenCalledWith(
      expect.anything(),
      77,
      expect.objectContaining({ date: "2026-05-02", amount: -9000 })
    );
  });

  it("un-archives a settled receivable that becomes unsettled", async () => {
    mockFindById.mockResolvedValue({ id: 5, amount: 10000, settled: 1, archived: 1 });
    mockSumByReceivableId.mockResolvedValue(8000);

    await updateReceivable(5, { amount: 10000 });

    expect(mockSetSettled).toHaveBeenCalledWith(expect.anything(), 5, 0);
    expect(mockSetArchived).toHaveBeenCalledWith(expect.anything(), 5, 0);
  });
});
