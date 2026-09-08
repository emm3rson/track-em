import { navigateToLinkedEntryEditor } from "./linkedEntryNavigation";

const mockResolveLinkedLedgerDestination = jest.fn();

jest.mock("../../cashflow/service", () => ({
  resolveLinkedLedgerDestination: (...args: unknown[]) =>
    mockResolveLinkedLedgerDestination(...args),
}));

describe("navigateToLinkedEntryEditor", () => {
  beforeEach(() => {
    mockResolveLinkedLedgerDestination.mockReset();
  });

  it("navigates payable payment links to the exact payable payment editor", async () => {
    mockResolveLinkedLedgerDestination.mockResolvedValue({
      kind: "payablePayment",
      paymentId: 55,
      month: "2026-04-01",
      platform: "Electric Co",
    });
    const navigation = { navigate: jest.fn() } as never;

    await navigateToLinkedEntryEditor(navigation, {
      activityKey: "tx:1",
      id: 1,
      date: "2026-04-11",
      createdAt: "2026-04-11T10:00:00.000Z",
      amount: -2500,
      note: "Payable payment: Electric Co (2026-04)",
      accountId: 1,
      accountName: "Wallet",
      linkedExpenseId: null,
      linkedReceivablePaymentId: null,
      linkedPayablePaymentId: 55,
      transferGroupId: null,
      sourceKind: "PAYABLE_ACCOUNT_ENTRY",
    });

    expect((navigation as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith("MainTabs", {
      screen: "Obligations",
      params: expect.objectContaining({
        launchAction: "editPayablePayment",
        payablePaymentId: 55,
        payableMonth: "2026-04-01",
        payablePlatform: "Electric Co",
      }),
    });
  });
});
