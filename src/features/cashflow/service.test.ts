import { editTransaction, removeTransaction } from "./service";

const mockGetTransaction = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockDeleteTransaction = jest.fn();
const mockDeleteTransfer = jest.fn();

jest.mock("../../data", () => ({
  accountService: {
    getTransaction: (...args: unknown[]) => mockGetTransaction(...args),
    updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
    deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
    addManualEntry: jest.fn(),
    listActive: jest.fn(),
    listActiveByType: jest.fn(),
    listEligibleForLink: jest.fn(),
    getAccountActivity: jest.fn(),
  },
  transferService: {
    createTransfer: jest.fn(),
    deleteTransfer: (...args: unknown[]) => mockDeleteTransfer(...args),
  },
  fromCents: (value: number) => value / 100,
  toCents: (value: number) => Math.round(value * 100),
}));

describe("cashflow transfer guardrails", () => {
  beforeEach(() => {
    mockGetTransaction.mockReset();
    mockUpdateTransaction.mockReset();
    mockDeleteTransaction.mockReset();
    mockDeleteTransfer.mockReset();
  });

  it("blocks editing grouped transfer transactions", async () => {
    mockGetTransaction.mockResolvedValue({
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: "transfer_1",
    });

    await expect(editTransaction({ id: 1, dateIso: "2026-03-03", amount: -100 })).rejects.toThrow(
      "Transfer transactions cannot be edited individually."
    );
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it("deletes transfer group when removing a grouped transfer transaction", async () => {
    mockGetTransaction.mockResolvedValue({
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: "transfer_1",
    });

    await removeTransaction(1);
    expect(mockDeleteTransfer).toHaveBeenCalledWith("transfer_1");
    expect(mockDeleteTransaction).not.toHaveBeenCalled();
  });

  it("blocks editing lent money transactions directly", async () => {
    mockGetTransaction.mockResolvedValue({
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: null,
      entryKind: "LENT_MONEY_LINK",
    });

    await expect(editTransaction({ id: 1, dateIso: "2026-03-03", amount: -100 })).rejects.toThrow(
      "Lent money transactions can only be edited from Receivables."
    );
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it("blocks deleting lent money transactions directly", async () => {
    mockGetTransaction.mockResolvedValue({
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: null,
      transferGroupId: null,
      entryKind: "LENT_MONEY_LINK",
    });

    await expect(removeTransaction(1)).rejects.toThrow(
      "Lent money transactions can only be deleted from Receivables."
    );
    expect(mockDeleteTransaction).not.toHaveBeenCalled();
  });
});
