const mockExecAsync = jest.fn();

const mockFindExpenseById = jest.fn();
const mockUpdateExpense = jest.fn();
const mockDeleteExpenseById = jest.fn();
const mockFindPayablePaymentByExpenseId = jest.fn();
const mockFindTxByLinkedExpenseId = jest.fn();
const mockDeleteTxByLinkedExpenseId = jest.fn();
const mockUpsertLinkedEntry = jest.fn();
const mockFindActiveLinkable = jest.fn();

jest.mock("../getDb", () => ({
  getDb: jest.fn(async () => ({
    execAsync: (...args: unknown[]) => mockExecAsync(...args),
  })),
}));

jest.mock("../repositories/expenseRepo", () => ({
  findById: (...args: unknown[]) => mockFindExpenseById(...args),
  update: (...args: unknown[]) => mockUpdateExpense(...args),
  deleteById: (...args: unknown[]) => mockDeleteExpenseById(...args),
}));

jest.mock("../repositories/payablePaymentRepo", () => ({
  findByExpenseId: (...args: unknown[]) => mockFindPayablePaymentByExpenseId(...args),
}));

jest.mock("../repositories/transactionRepo", () => ({
  findByLinkedExpenseId: (...args: unknown[]) => mockFindTxByLinkedExpenseId(...args),
  deleteByLinkedExpenseId: (...args: unknown[]) => mockDeleteTxByLinkedExpenseId(...args),
  upsertLinkedEntry: (...args: unknown[]) => mockUpsertLinkedEntry(...args),
}));

jest.mock("../repositories/accountRepo", () => ({
  findActiveLinkable: (...args: unknown[]) => mockFindActiveLinkable(...args),
}));

jest.mock("../repositories/expenseCategoryRepo", () => ({}));

import { deleteExpense, updateExpense } from "./expenseService";

beforeEach(() => {
  jest.clearAllMocks();
  mockExecAsync.mockResolvedValue(undefined);
  mockFindPayablePaymentByExpenseId.mockResolvedValue(null);
  mockFindTxByLinkedExpenseId.mockResolvedValue(null);
});

describe("updateExpense guards", () => {
  it("blocks editing an expense created by a bill payment", async () => {
    mockFindExpenseById.mockResolvedValue({ id: 1, accountId: 2 });
    mockFindPayablePaymentByExpenseId.mockResolvedValue({ id: 9 });

    await expect(
      updateExpense({ id: 1, dateIso: "2026-05-01", amount: 500, categoryId: 1 })
    ).rejects.toThrow("can only be edited from Obligations");

    expect(mockUpdateExpense).not.toHaveBeenCalled();
    expect(mockDeleteTxByLinkedExpenseId).not.toHaveBeenCalled();
    expect(mockUpsertLinkedEntry).not.toHaveBeenCalled();
  });

  it("blocks editing a transfer fee expense", async () => {
    mockFindExpenseById.mockResolvedValue({ id: 2, accountId: 2 });
    mockFindTxByLinkedExpenseId.mockResolvedValue({ id: 77, transferGroupId: "transfer_1" });

    await expect(
      updateExpense({ id: 2, dateIso: "2026-05-01", amount: 50, categoryId: 1 })
    ).rejects.toThrow("transfer fee");

    expect(mockUpdateExpense).not.toHaveBeenCalled();
    expect(mockDeleteTxByLinkedExpenseId).not.toHaveBeenCalled();
    expect(mockUpsertLinkedEntry).not.toHaveBeenCalled();
  });

  it("blocks moving an expense into an ineligible account", async () => {
    mockFindExpenseById.mockResolvedValue({ id: 3, accountId: 2 });
    mockFindActiveLinkable.mockResolvedValue(null);

    await expect(
      updateExpense({ id: 3, dateIso: "2026-05-01", amount: 500, categoryId: 1, accountId: 99 })
    ).rejects.toThrow("not eligible");

    expect(mockUpdateExpense).not.toHaveBeenCalled();
  });
});

describe("deleteExpense guards", () => {
  it("blocks deleting an expense created by a bill payment", async () => {
    mockFindExpenseById.mockResolvedValue({ id: 1, accountId: 2 });
    mockFindPayablePaymentByExpenseId.mockResolvedValue({ id: 9 });

    await expect(deleteExpense(1)).rejects.toThrow("can only be deleted from Obligations");

    expect(mockDeleteExpenseById).not.toHaveBeenCalled();
  });

  it("blocks deleting a transfer fee expense", async () => {
    mockFindExpenseById.mockResolvedValue({ id: 2, accountId: 2 });
    mockFindTxByLinkedExpenseId.mockResolvedValue({ id: 77, transferGroupId: "transfer_1" });

    await expect(deleteExpense(2)).rejects.toThrow("transfer fee");

    expect(mockDeleteExpenseById).not.toHaveBeenCalled();
    expect(mockDeleteTxByLinkedExpenseId).not.toHaveBeenCalled();
  });
});
