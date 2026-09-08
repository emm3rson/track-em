const mockSumBalanceByType = jest.fn();
const mockSumOwedReceivables = jest.fn();
const mockSumAllUnpaidPayables = jest.fn();
const mockSumUnpaidPayablesRange = jest.fn();
const mockListUnpaidByMonth = jest.fn();
const mockFindLastPayableMonth = jest.fn();

jest.mock("../getDb", () => ({
  getDb: jest.fn(async () => ({})),
}));

jest.mock("../repositories/dashboardRepo", () => ({
  sumBalanceByType: (...args: unknown[]) => mockSumBalanceByType(...args),
  sumOwedReceivables: (...args: unknown[]) => mockSumOwedReceivables(...args),
  sumAllUnpaidPayables: (...args: unknown[]) => mockSumAllUnpaidPayables(...args),
  sumUnpaidPayablesRange: (...args: unknown[]) => mockSumUnpaidPayablesRange(...args),
  listUnpaidByMonth: (...args: unknown[]) => mockListUnpaidByMonth(...args),
  findLastPayableMonth: (...args: unknown[]) => mockFindLastPayableMonth(...args),
}));

import { loadSnapshot } from "./dashboardService";

describe("dashboardService.loadSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates net position correctly accounting for remaining unpaid credits", async () => {
    // Wallets: 10,000 (already reduced by 9,000 payment towards 10,000 bill)
    // Savings: 5,000
    // People owe: 2,000
    // Total funds: 17,000
    mockSumBalanceByType.mockImplementation((_db, type) => {
      if (type === "SOURCE") return Promise.resolve(10000);
      if (type === "SAVINGS") return Promise.resolve(5000);
      return Promise.resolve(0);
    });
    mockSumOwedReceivables.mockResolvedValue(2000);

    // Remaining unpaid on the 10,000 bill after 9,000 payment is 1,000
    mockSumAllUnpaidPayables.mockResolvedValue(1000);
    mockSumUnpaidPayablesRange.mockResolvedValue(1000);
    mockListUnpaidByMonth.mockResolvedValue([{ month: "2026-09-01", unpaid: 1000 }]);
    mockFindLastPayableMonth.mockResolvedValue("2026-09-01");

    const snapshot = await loadSnapshot(new Date("2026-09-15T00:00:00Z"));

    expect(snapshot.wallets).toBe(10000);
    expect(snapshot.savings).toBe(5000);
    expect(snapshot.peopleOwe).toBe(2000);
    expect(snapshot.totalFunds).toBe(17000);
    expect(snapshot.currentMonth.credits).toBe(1000);
    // Net position must be 17,000 - 1,000 = 16,000 (not 17,000 - 10,000 = 7,000)
    expect(snapshot.currentMonth.net).toBe(16000);
  });
});
