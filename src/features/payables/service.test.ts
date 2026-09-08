import {
  duplicatePayableToMonth,
  loadPayablesSnapshot,
  loadPayments,
  loadPayablePaymentByEntry,
} from "./service";

const mockListPayables = jest.fn();
const mockListStatusTotalsByMonth = jest.fn();
const mockAutoArchiveFullyPaidMonths = jest.fn();
const mockListPayments = jest.fn();
const mockGetPaymentByMonthAndBiller = jest.fn();
const mockSavePayable = jest.fn();
const mockListEligibleForLink = jest.fn();

jest.mock("../../data", () => ({
  accountService: {
    listEligibleForLink: (...args: unknown[]) => mockListEligibleForLink(...args),
  },
  payableService: {
    listPayables: (...args: unknown[]) => mockListPayables(...args),
    listStatusTotalsByMonth: (...args: unknown[]) => mockListStatusTotalsByMonth(...args),
    autoArchiveFullyPaidMonths: (...args: unknown[]) => mockAutoArchiveFullyPaidMonths(...args),
    listPayments: (...args: unknown[]) => mockListPayments(...args),
    getPaymentByMonthAndBiller: (...args: unknown[]) => mockGetPaymentByMonthAndBiller(...args),
    upsertPayable: (...args: unknown[]) => mockSavePayable(...args),
  },
  fromCents: (value: number) => value / 100,
  toCents: (value: number) => Math.round(value * 100),
}));

describe("payables feature service", () => {
  beforeEach(() => {
    mockListPayables.mockReset();
    mockListStatusTotalsByMonth.mockReset();
    mockAutoArchiveFullyPaidMonths.mockReset();
    mockListPayments.mockReset();
    mockGetPaymentByMonthAndBiller.mockReset();
    mockSavePayable.mockReset();
    mockListEligibleForLink.mockReset();
  });

  it("maps payables with computed partial-payment fields into the snapshot", async () => {
    mockListPayables
      .mockResolvedValueOnce([
        {
          id: 10,
          billerId: 2,
          billerName: "Electric Co",
          month: "2026-04-01",
          dueDate: "2026-04-15",
          amount: 10000,
          status: "UNPAID",
          categoryId: 1,
          categoryName: "Bills",
          defaultAccountId: 4,
          archived: 0,
          createdAt: "2026-04-01T00:00:00.000Z",
          paidAmount: 4000,
          remainingAmount: 6000,
          paymentCount: 2,
          latestPaidAt: "2026-04-11",
          displayStatus: "PARTIALLY_PAID",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 11,
          billerId: 3,
          billerName: "Water Co",
          month: "2026-03-01",
          dueDate: "2026-03-10",
          amount: 5000,
          status: "PAID",
          categoryId: 1,
          categoryName: "Bills",
          defaultAccountId: null,
          archived: 1,
          createdAt: "2026-03-01T00:00:00.000Z",
          paidAmount: 5000,
          remainingAmount: 0,
          paymentCount: 1,
          latestPaidAt: "2026-03-08",
          displayStatus: "PAID",
        },
      ]);
    mockListStatusTotalsByMonth.mockResolvedValue([
      { month: "2026-04-01", paid: 4000, remaining: 6000 },
      { month: "2026-03-01", paid: 5000, remaining: 0 },
    ]);

    const snapshot = await loadPayablesSnapshot();

    expect(snapshot.rows).toEqual([
      expect.objectContaining({
        platform: "Electric Co",
        amount: 100,
        paidAmount: 40,
        remainingAmount: 60,
        paymentCount: 2,
        latestPaidAt: "2026-04-11",
        status: "PARTIALLY_PAID",
      }),
      expect.objectContaining({
        platform: "Water Co",
        amount: 50,
        paidAmount: 50,
        remainingAmount: 0,
        paymentCount: 1,
        status: "PAID",
      }),
    ]);
    expect(snapshot.statusTotalsByMonth.get("2026-04-01")).toEqual({
      paid: 40,
      remaining: 60,
    });
  });

  it("loads payable payment history in descending order", async () => {
    mockListPayments.mockResolvedValue([
      {
        id: 7,
        payableId: 10,
        accountId: 4,
        accountName: "Wallet",
        expenseId: 12,
        amount: 2500,
        paidAt: "2026-04-11",
        note: "Online payment",
        createdAt: "2026-04-11T10:00:00.000Z",
      },
    ]);

    const result = await loadPayments(10);

    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        amount: 25,
        paidAt: "2026-04-11",
        accountName: "Wallet",
      }),
    ]);
  });

  it("loads the latest payment for a payable entry with converted amounts", async () => {
    mockGetPaymentByMonthAndBiller.mockResolvedValue({
      id: 7,
      payableId: 10,
      month: "2026-04-01",
      billerName: "Electric Co",
      accountId: 4,
      accountName: "Wallet",
      expenseId: 12,
      amount: 2500,
      paidAt: "2026-04-11",
      note: "Online payment",
      createdAt: "2026-04-11T10:00:00.000Z",
    });

    const payment = await loadPayablePaymentByEntry({
      platform: "Electric Co",
      monthIsoAnchor: "2026-04-01",
    });

    expect(payment).toEqual(
      expect.objectContaining({
        id: 7,
        platform: "Electric Co",
        amount: 25,
        paidAt: "2026-04-11",
      })
    );
  });

  it("duplicates a payable into a new month as unpaid with zero paid progress", async () => {
    await duplicatePayableToMonth({
      platform: "Electric Co",
      targetMonthIsoAnchor: "2026-05-01",
      sourceDueDateIso: "2026-04-15",
      amount: 100,
      status: "PAID",
      categoryId: 1,
      preferredAccountId: 4,
      existing: {
        id: 22,
        platform: "Electric Co",
        month: "2026-05-01",
        dueDate: "2026-05-15",
        amount: 70,
        paidAmount: 70,
        remainingAmount: 0,
        paymentCount: 1,
        latestPaidAt: "2026-05-08",
        status: "PAID",
        categoryId: 1,
        categoryName: "Bills",
        preferredAccountId: 4,
      },
    });

    expect(mockSavePayable).toHaveBeenCalledWith(
      expect.objectContaining({
        billerName: "Electric Co",
        monthIsoAnchor: "2026-05-01",
        amount: 10000,
        status: "UNPAID",
      })
    );
  });
});
