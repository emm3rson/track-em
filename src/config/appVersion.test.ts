jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: null as { extra?: { displayVersion?: string } } | null },
}));

import Constants from "expo-constants";

import { getAppVersionLabel } from "./appVersion";

describe("getAppVersionLabel", () => {
  const fallbackVersion = "4.0.0";

  afterEach(() => {
    (Constants as { expoConfig?: { extra?: { displayVersion?: string } } | null }).expoConfig =
      null;
  });

  it("prefers the Expo display version", () => {
    (Constants as { expoConfig?: { extra?: { displayVersion?: string } } }).expoConfig = {
      extra: { displayVersion: "4.0.0" },
    };

    expect(getAppVersionLabel()).toBe("4.0.0");
  });

  it("uses hard fallback when Expo config displayVersion is missing", () => {
    (Constants as { expoConfig?: { extra?: { displayVersion?: string } } | null }).expoConfig =
      null;

    expect(getAppVersionLabel()).toBe(fallbackVersion);
  });

  it("uses hard fallback when no runtime version metadata exists", () => {
    (Constants as { expoConfig?: { extra?: { displayVersion?: string } } | null }).expoConfig =
      null;

    expect(getAppVersionLabel()).toBe(fallbackVersion);
  });
});
