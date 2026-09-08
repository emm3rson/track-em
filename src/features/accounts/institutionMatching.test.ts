import {
  filterInstitutions,
  findInstitution,
  resolveCanonicalInstitutionName,
} from "./institutionMatching";

describe("institutionMatching", () => {
  it("resolves canonical institutions from aliases", () => {
    expect(findInstitution("Bank of the Philippine Islands")?.name).toBe("BPI");
    expect(findInstitution("Union Bank")?.name).toBe("UnionBank");
  });

  it("canonicalizes known aliases and preserves unknown values", () => {
    expect(resolveCanonicalInstitutionName("Rizal Commercial Banking Corporation")).toBe("RCBC");
    expect(resolveCanonicalInstitutionName("My Coop")).toBe("My Coop");
    expect(resolveCanonicalInstitutionName(null)).toBeNull();
  });

  it("filters suggestions without returning blank results", () => {
    expect(filterInstitutions("pag", 5).map((item) => item.name)).toContain("Pag-IBIG");
    expect(filterInstitutions("   ", 5)).toEqual([]);
  });

  it("does not produce a false positive for ambiguous or low-signal input", () => {
    expect(findInstitution("zzz")).toBeUndefined();
    expect(findInstitution("   ")).toBeUndefined();
  });
});
