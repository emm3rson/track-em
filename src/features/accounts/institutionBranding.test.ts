jest.mock("./institutionLogoCatalog", () => ({
  INSTITUTION_LOGO_ASSETS: {
    bpi: 101,
  },
}));

import { resolveInstitutionBranding } from "./institutionBranding";

describe("institutionBranding", () => {
  it("resolves a bundled logo for a known institution", () => {
    expect(resolveInstitutionBranding({ institution: "BPI" })).toEqual({
      fallbackLabel: "BP",
      institutionName: "BPI",
      institutionLogoKey: "bpi",
      localSource: 101,
    });
  });

  it("falls back cleanly to initials when no bundled logo is available", () => {
    expect(resolveInstitutionBranding({ institution: "Unknown Bank" })).toEqual({
      fallbackLabel: "UB",
      institutionName: null,
      institutionLogoKey: null,
      localSource: undefined,
    });
  });

  it("falls back to initials when no institution is provided", () => {
    expect(resolveInstitutionBranding({ institution: null, accountName: "My Coop" })).toEqual({
      fallbackLabel: "MC",
      institutionName: null,
      institutionLogoKey: null,
      localSource: undefined,
    });
  });
});
