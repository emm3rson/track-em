import { buildDefaultLedgerSheetActions, isEditableLedgerEntry } from "./actionPolicy";
import type { LedgerEntryActionTarget } from "./types";

function makeEntry(overrides: Partial<LedgerEntryActionTarget> = {}): LedgerEntryActionTarget {
  return {
    activityKey: "tx:1",
    id: 1,
    date: "2026-03-03",
    createdAt: "2026-03-03T10:00:00.000Z",
    amount: -100,
    note: "Sample",
    accountId: 1,
    accountName: "Wallet",
    linkedExpenseId: null,
    linkedReceivablePaymentId: null,
    linkedPayablePaymentId: null,
    transferGroupId: null,
    sourceKind: "MANUAL_ACCOUNT_ENTRY",
    ...overrides,
  };
}

describe("isEditableLedgerEntry", () => {
  it("returns false for grouped transfer entries", () => {
    const entry = makeEntry({ transferGroupId: "transfer_123" });
    expect(isEditableLedgerEntry(entry)).toBe(false);
  });

  it("returns false for expense-linked entries", () => {
    const entry = makeEntry({ linkedExpenseId: 10 });
    expect(isEditableLedgerEntry(entry)).toBe(false);
  });

  it("returns true for a standalone manual entry", () => {
    const entry = makeEntry();
    expect(isEditableLedgerEntry(entry)).toBe(true);
  });

  it("returns delete-transfer action for grouped transfer entries", () => {
    const actions = buildDefaultLedgerSheetActions({
      entry: makeEntry({ transferGroupId: "transfer_123" }),
      isArchiving: false,
      onEdit: jest.fn(),
      onArchive: jest.fn(),
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].key).toBe("delete-transfer");
    expect(actions[0].label).toBe("Delete Transfer");
  });
});
