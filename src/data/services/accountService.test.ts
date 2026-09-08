const mockExecAsync = jest.fn();

const mockFindTxById = jest.fn();
const mockFindAccountById = jest.fn();
const mockFindActiveById = jest.fn();
const mockUpdateTx = jest.fn();
const mockDeleteTxById = jest.fn();

jest.mock("../getDb", () => ({
  getDb: jest.fn(async () => ({
    execAsync: (...args: unknown[]) => mockExecAsync(...args),
  })),
}));

jest.mock("../repositories/transactionRepo", () => ({
  findById: (...args: unknown[]) => mockFindTxById(...args),
  update: (...args: unknown[]) => mockUpdateTx(...args),
  deleteById: (...args: unknown[]) => mockDeleteTxById(...args),
}));

jest.mock("../repositories/accountRepo", () => ({
  findById: (...args: unknown[]) => mockFindAccountById(...args),
  findActiveById: (...args: unknown[]) => mockFindActiveById(...args),
}));

import { deleteTransaction, updateTransaction } from "./accountService";

const manualTx = {
  id: 1,
  accountId: 2,
  transferGroupId: null,
  linkedExpenseId: null,
  linkedReceivablePaymentId: null,
  linkedPayablePaymentId: null,
  entryKind: "MANUAL",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockExecAsync.mockResolvedValue(undefined);
  mockFindAccountById.mockResolvedValue({ id: 2, archived: 0 });
  mockFindActiveById.mockResolvedValue({ id: 2, archived: 0 });
});

describe("updateTransaction guards", () => {
  it("throws when the transaction does not exist", async () => {
    mockFindTxById.mockResolvedValue(null);

    await expect(
      updateTransaction({ id: 999, dateIso: "2026-05-01", amount: 100 })
    ).rejects.toThrow("Transaction not found.");

    expect(mockUpdateTx).not.toHaveBeenCalled();
  });

  it("blocks editing reconciliation entries", async () => {
    mockFindTxById.mockResolvedValue({ ...manualTx, entryKind: "RECONCILIATION" });

    await expect(updateTransaction({ id: 1, dateIso: "2026-05-01", amount: 100 })).rejects.toThrow(
      "Reconciliation entries cannot be changed directly."
    );

    expect(mockUpdateTx).not.toHaveBeenCalled();
  });

  it("blocks editing transactions in archived accounts", async () => {
    mockFindTxById.mockResolvedValue(manualTx);
    mockFindAccountById.mockResolvedValue({ id: 2, archived: 1 });

    await expect(updateTransaction({ id: 1, dateIso: "2026-05-01", amount: 100 })).rejects.toThrow(
      "archived account"
    );

    expect(mockUpdateTx).not.toHaveBeenCalled();
  });

  it("blocks editing linked transfer legs directly", async () => {
    mockFindTxById.mockResolvedValue({ ...manualTx, transferGroupId: "transfer_1" });

    await expect(updateTransaction({ id: 1, dateIso: "2026-05-01", amount: 100 })).rejects.toThrow(
      "Transfer transactions cannot be changed individually."
    );

    expect(mockUpdateTx).not.toHaveBeenCalled();
  });
});

describe("deleteTransaction guards", () => {
  it("is idempotent when the transaction does not exist", async () => {
    mockFindTxById.mockResolvedValue(null);

    await expect(deleteTransaction(999)).resolves.toBeUndefined();
    expect(mockDeleteTxById).not.toHaveBeenCalled();
  });

  it("blocks deleting lent-money transactions directly", async () => {
    mockFindTxById.mockResolvedValue({ ...manualTx, entryKind: "LENT_MONEY_LINK" });

    await expect(deleteTransaction(1)).rejects.toThrow(
      "Lent money transactions can only be changed from Receivables."
    );

    expect(mockDeleteTxById).not.toHaveBeenCalled();
  });
});
