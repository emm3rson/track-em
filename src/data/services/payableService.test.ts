const mockExecAsync = jest.fn();

const mockFindPayableById = jest.fn();
const mockFindBillerById = jest.fn();
const mockFindActiveLinkable = jest.fn();
const mockFindFallbackId = jest.fn();
const mockSumByPayableId = jest.fn();
const mockInsertExpense = jest.fn();
const mockInsertPayment = jest.fn();
const mockUpdateStatus = jest.fn();
const mockUpdateCategoryId = jest.fn();
const mockListPaymentsByPayableId = jest.fn();
const mockDeleteLinkedTx = jest.fn();
const mockDeleteExpenseById = jest.fn();
const mockDeletePaymentById = jest.fn();
const mockDeletePayableById = jest.fn();

jest.mock("../getDb", () => ({
  getDb: jest.fn(async () => ({
    execAsync: (...args: unknown[]) => mockExecAsync(...args),
  })),
}));

jest.mock("../repositories/payableRepo", () => ({
  findById: (...args: unknown[]) => mockFindPayableById(...args),
  updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
  updateCategoryId: (...args: unknown[]) => mockUpdateCategoryId(...args),
  deleteById: (...args: unknown[]) => mockDeletePayableById(...args),
}));

jest.mock("../repositories/billerRepo", () => ({
  findById: (...args: unknown[]) => mockFindBillerById(...args),
}));

jest.mock("../repositories/accountRepo", () => ({
  findActiveLinkable: (...args: unknown[]) => mockFindActiveLinkable(...args),
}));

jest.mock("../repositories/expenseCategoryRepo", () => ({
  findFallbackId: (...args: unknown[]) => mockFindFallbackId(...args),
}));

jest.mock("../repositories/payablePaymentRepo", () => ({
  sumByPayableId: (...args: unknown[]) => mockSumByPayableId(...args),
  insert: (...args: unknown[]) => mockInsertPayment(...args),
  listByPayableId: (...args: unknown[]) => mockListPaymentsByPayableId(...args),
  deleteById: (...args: unknown[]) => mockDeletePaymentById(...args),
}));

jest.mock("../repositories/expenseRepo", () => ({
  insert: (...args: unknown[]) => mockInsertExpense(...args),
  deleteById: (...args: unknown[]) => mockDeleteExpenseById(...args),
}));

jest.mock("../repositories/transactionRepo", () => ({
  upsertLinkedEntry: jest.fn(),
  deleteByLinkedPayablePaymentId: (...args: unknown[]) => mockDeleteLinkedTx(...args),
}));

import { deletePayable, recordPayablePayment } from "./payableService";

describe("data payable service", () => {
  beforeEach(() => {
    mockExecAsync.mockReset();
    mockFindPayableById.mockReset();
    mockFindBillerById.mockReset();
    mockFindActiveLinkable.mockReset();
    mockFindFallbackId.mockReset();
    mockSumByPayableId.mockReset();
    mockInsertExpense.mockReset();
    mockInsertPayment.mockReset();
    mockUpdateStatus.mockReset();
    mockUpdateCategoryId.mockReset();
    mockListPaymentsByPayableId.mockReset();
    mockDeleteLinkedTx.mockReset();
    mockDeleteExpenseById.mockReset();
    mockDeletePaymentById.mockReset();
    mockDeletePayableById.mockReset();
  });

  it("rejects a payable payment that exceeds the remaining balance", async () => {
    mockFindPayableById.mockResolvedValue({
      id: 5,
      billerId: 3,
      month: "2026-04-01",
      dueDate: "2026-04-15",
      amount: 10000,
      status: "UNPAID",
      categoryId: 1,
      archived: 0,
      createdAt: "2026-04-01T00:00:00.000Z",
    });
    mockFindBillerById.mockResolvedValue({
      id: 3,
      name: "Electric Co",
      defaultCategoryId: 1,
      defaultAccountId: null,
      archived: 0,
      createdAt: "2026-04-01T00:00:00.000Z",
    });
    mockSumByPayableId.mockResolvedValue(9000);
    mockFindFallbackId.mockResolvedValue(1);

    await expect(
      recordPayablePayment({
        payableId: 5,
        amount: 2000,
        accountId: null,
        categoryIdOverride: null,
        paymentDateIso: "2026-04-12",
      })
    ).rejects.toThrow("Payment exceeds remaining balance.");

    expect(mockInsertExpense).not.toHaveBeenCalled();
    expect(mockInsertPayment).not.toHaveBeenCalled();
  });

  it("deletes every linked payable payment artifact before deleting the payable", async () => {
    mockListPaymentsByPayableId.mockResolvedValue([
      { id: 10, expenseId: 100 },
      { id: 11, expenseId: null },
    ]);

    await deletePayable(5);

    expect(mockDeleteLinkedTx).toHaveBeenNthCalledWith(1, expect.anything(), 10);
    expect(mockDeleteLinkedTx).toHaveBeenNthCalledWith(2, expect.anything(), 11);
    expect(mockDeleteExpenseById).toHaveBeenCalledTimes(1);
    expect(mockDeleteExpenseById).toHaveBeenCalledWith(expect.anything(), 100);
    expect(mockDeletePaymentById).toHaveBeenCalledTimes(2);
    expect(mockDeletePayableById).toHaveBeenCalledWith(expect.anything(), 5);
  });
});
