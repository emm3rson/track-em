jest.mock("./institutionBranding", () => ({
  resolveInstitutionBranding: jest.fn(),
}));

import { resolveInstitutionBranding } from "./institutionBranding";
import { resolveInstitutionLogoSource } from "./institutionLogoResolver";

const mockResolveInstitutionBranding = resolveInstitutionBranding as jest.MockedFunction<
  typeof resolveInstitutionBranding
>;

describe("institutionLogoResolver", () => {
  beforeEach(() => {
    mockResolveInstitutionBranding.mockReset();
  });

  it("resolves local asset when localSource is present", () => {
    mockResolveInstitutionBranding.mockReturnValue({
      fallbackLabel: "BP",
      institutionName: "BPI",
      institutionLogoKey: "bpi",
      localSource: 1234,
    });

    const resolution = resolveInstitutionLogoSource({
      institution: "BPI",
    });

    expect(resolution).toEqual({
      kind: "local",
      source: 1234,
      fallbackLabel: "BP",
      institutionName: "BPI",
      institutionLogoKey: "bpi",
    });
  });

  it("falls back to initials when localSource is not present", () => {
    mockResolveInstitutionBranding.mockReturnValue({
      fallbackLabel: "UB",
      institutionName: "Unknown Bank",
      institutionLogoKey: null,
      localSource: undefined,
    });

    const resolution = resolveInstitutionLogoSource({
      institution: "Unknown Bank",
    });

    expect(resolution).toEqual({
      kind: "initials",
      reason: "missing-source",
      fallbackLabel: "UB",
      institutionName: "Unknown Bank",
      institutionLogoKey: null,
    });
  });
});
