const mockGetDb = jest.fn();

jest.mock("../data/getDb", () => ({
  getDb: () => mockGetDb(),
}));

import { bootstrap } from "./bootstrap";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("bootstrap", () => {
  it("resolves when getDb succeeds", async () => {
    mockGetDb.mockResolvedValue({});

    await expect(bootstrap()).resolves.toBeUndefined();
    expect(mockGetDb).toHaveBeenCalledTimes(1);
  });

  it("propagates error when getDb throws", async () => {
    mockGetDb.mockRejectedValue(new Error("DB init failed"));

    await expect(bootstrap()).rejects.toThrow("DB init failed");
  });
});
