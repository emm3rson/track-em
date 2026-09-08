const mockOpenDb = jest.fn();
const mockInitDb = jest.fn();
const mockGetDemoModeEnabled = jest.fn();
const mockGetCachedDemoMode = jest.fn();

jest.mock("./db", () => ({
  openDb: (...args: unknown[]) => mockOpenDb(...args),
  initDb: (...args: unknown[]) => mockInitDb(...args),
}));

jest.mock("../utils/demoMode", () => ({
  getDemoModeEnabled: (...args: unknown[]) => mockGetDemoModeEnabled(...args),
  getCachedDemoMode: (...args: unknown[]) => mockGetCachedDemoMode(...args),
  setDemoModeEnabled: jest.fn(),
  subscribeDemoMode: jest.fn(() => jest.fn()),
}));

import { getDb, resetDbCache } from "./getDb";

beforeEach(() => {
  jest.clearAllMocks();
  resetDbCache();
  mockGetCachedDemoMode.mockReturnValue(false);
  mockGetDemoModeEnabled.mockResolvedValue(false);
  mockOpenDb.mockResolvedValue({ closeAsync: jest.fn() });
  mockInitDb.mockResolvedValue(undefined);
});

describe("resetDbCache", () => {
  it("forces getDb to call openDb again after reset", async () => {
    await getDb();
    expect(mockOpenDb).toHaveBeenCalledTimes(1);

    resetDbCache();

    await getDb();
    expect(mockOpenDb).toHaveBeenCalledTimes(2);
  });

  it("forces getDb to call initDb again after reset", async () => {
    await getDb();
    expect(mockInitDb).toHaveBeenCalledTimes(1);

    resetDbCache();

    await getDb();
    expect(mockInitDb).toHaveBeenCalledTimes(2);
  });

  it("does not throw when called before any getDb call", () => {
    expect(() => resetDbCache()).not.toThrow();
  });
});

describe("getDb", () => {
  it("returns the same promise on repeated calls without reset", async () => {
    const p1 = getDb();
    const p2 = getDb();

    expect(p1).toBe(p2);
    await p1;
  });
});
